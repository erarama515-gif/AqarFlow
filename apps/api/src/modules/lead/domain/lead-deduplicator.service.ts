import { Injectable } from '@nestjs/common';
import { Lead } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

export interface DedupCandidate {
  leadId: string;
  matchType: 'phone' | 'email' | 'national_id';
  confidence: number; // 0..1
}

/**
 * LeadDeduplicator
 *
 * Detects whether an incoming lead corresponds to an existing record. The
 * order of checks is deliberate: phone first (highest signal in MENA), then
 * national ID (when present), then email. We always return *candidates*
 * rather than auto-merging — the agent or distribution policy decides what
 * to do with them.
 */
@Injectable()
export class LeadDeduplicatorService {
  constructor(private readonly prisma: PrismaService) {}

  async findCandidates(
    tenantId: string,
    input: {
      phoneNormalized?: string | null;
      emailLower?: string | null;
      nationalId?: string | null;
    },
  ): Promise<DedupCandidate[]> {
    const out: DedupCandidate[] = [];

    if (input.phoneNormalized) {
      const phoneMatches = await this.prisma.lead.findMany({
        where: {
          tenantId,
          phoneNormalized: input.phoneNormalized,
          deletedAt: null,
        },
        select: { id: true },
        take: 5,
      });
      phoneMatches.forEach((m) =>
        out.push({ leadId: m.id, matchType: 'phone', confidence: 1.0 }),
      );
    }

    if (input.nationalId) {
      const idMatches = await this.prisma.lead.findMany({
        where: {
          tenantId,
          nationalId: input.nationalId,
          deletedAt: null,
        },
        select: { id: true },
        take: 5,
      });
      idMatches.forEach((m) =>
        out.push({ leadId: m.id, matchType: 'national_id', confidence: 1.0 }),
      );
    }

    if (input.emailLower) {
      const emailMatches = await this.prisma.lead.findMany({
        where: {
          tenantId,
          emailLower: input.emailLower,
          deletedAt: null,
        },
        select: { id: true },
        take: 5,
      });
      emailMatches.forEach((m) =>
        out.push({ leadId: m.id, matchType: 'email', confidence: 0.85 }),
      );
    }

    // Deduplicate the list of candidates themselves
    const seen = new Set<string>();
    return out.filter((c) => {
      if (seen.has(c.leadId)) return false;
      seen.add(c.leadId);
      return true;
    });
  }
}
