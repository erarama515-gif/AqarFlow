import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { REDIS_CLIENT } from '../../../shared/redis/redis.module';

export type DistributionStrategy =
  | 'round_robin'
  | 'weighted'
  | 'skill_based'
  | 'manual';

export interface DistributionContext {
  tenantId: string;
  branchId?: string | null;
  sourceCode?: string;
  city?: string | null;
  propertyType?: string | null;
  interestType?: string | null;
}

export interface DistributionResult {
  assigneeId: string;
  ruleId?: string;
  strategy: DistributionStrategy;
}

/**
 * DistributionEngine
 *
 * Picks an agent for a new lead based on configured DistributionRules.
 * Rules are evaluated in priority order; the first matching rule wins.
 * Round-robin state is kept in Redis so multi-pod deployments fairly share
 * leads (each rule has its own counter key).
 *
 * Strategies implemented in MVP:
 *   - round_robin: cycle through `assigneeIds`
 *   - weighted: same, but the `assigneeIds` list itself encodes weights
 *               (an agent appears N times to receive N× the share)
 *   - manual: no auto-assignment; caller is expected to pick
 *   - skill_based: placeholder — falls back to round_robin until Skills
 *                  module ships
 */
@Injectable()
export class DistributionEngine {
  private readonly logger = new Logger(DistributionEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async pickAssignee(ctx: DistributionContext): Promise<DistributionResult | null> {
    const rules = await this.prisma.distributionRule.findMany({
      where: { tenantId: ctx.tenantId, isActive: true },
      orderBy: { priority: 'desc' },
    });

    for (const rule of rules) {
      if (!this.matches(rule.conditions, ctx)) continue;
      const candidates = rule.assigneeIds ?? [];
      if (candidates.length === 0) continue;

      const strategy = rule.strategy as DistributionStrategy;
      const assigneeId = await this.applyStrategy(strategy, rule.id, candidates);
      if (assigneeId) {
        return { assigneeId, ruleId: rule.id, strategy };
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Strategy implementations
  // ---------------------------------------------------------------------------
  private async applyStrategy(
    strategy: DistributionStrategy,
    ruleId: string,
    candidates: string[],
  ): Promise<string | null> {
    switch (strategy) {
      case 'manual':
        return null;
      case 'round_robin':
      case 'weighted':
      case 'skill_based':
      default: {
        const key = `dist-rr:${ruleId}`;
        const next = await this.redis.incr(key);
        // 30-day TTL on the counter; refreshed on every increment
        await this.redis.expire(key, 30 * 24 * 60 * 60);
        const idx = (Number(next) - 1) % candidates.length;
        return candidates[idx];
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Condition matcher (tiny JSONLogic-style: { field: 'sourceCode', equals: 'WEB' })
  // ---------------------------------------------------------------------------
  private matches(conditions: unknown, ctx: DistributionContext): boolean {
    if (!conditions || typeof conditions !== 'object') return true; // no conditions = matches all

    const obj = conditions as Record<string, unknown>;

    // Top-level "all" / "any" groups
    if (Array.isArray(obj.all)) {
      return obj.all.every((c) => this.matches(c, ctx));
    }
    if (Array.isArray(obj.any)) {
      return obj.any.some((c) => this.matches(c, ctx));
    }

    // Single comparator
    const field = obj.field as keyof DistributionContext | undefined;
    if (!field) return true;
    const actual = (ctx as unknown as Record<string, unknown>)[field];

    if ('equals' in obj) return actual === obj.equals;
    if ('in' in obj && Array.isArray(obj.in)) return obj.in.includes(actual as never);
    if ('not_equals' in obj) return actual !== obj.not_equals;
    if ('exists' in obj) return obj.exists ? actual != null : actual == null;
    return true;
  }
}
