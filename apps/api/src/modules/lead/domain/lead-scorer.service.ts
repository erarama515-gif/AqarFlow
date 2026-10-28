import { Injectable } from '@nestjs/common';
import { Lead } from '@prisma/client';

export type LeadUrgency = 'cold' | 'warm' | 'hot';

interface ScoringContext {
  hasPhone: boolean;
  hasEmail: boolean;
  hasBudget: boolean;
  hasInterest: boolean;
  fromPaidSource: boolean;
  recentActivityCount: number;
}

/**
 * Simple, deterministic rule-based scorer. Returns a numeric 0-100 score
 * along with a coarse urgency label that the UI can use for visual cues
 * (red dot for hot, yellow for warm, gray for cold).
 *
 * We intentionally do not use any ML / paid AI service here — the score
 * has to make sense without external dependencies, and the rules can be
 * tuned by tenants later via a configuration UI.
 */
@Injectable()
export class LeadScorerService {
  score(ctx: ScoringContext): { score: number; urgency: LeadUrgency } {
    let score = 30; // base score for any new lead

    if (ctx.hasPhone) score += 15;
    if (ctx.hasEmail) score += 10;
    if (ctx.hasBudget) score += 15;
    if (ctx.hasInterest) score += 10;
    if (ctx.fromPaidSource) score += 10;
    // Recent activity is a strong intent signal
    score += Math.min(ctx.recentActivityCount * 3, 15);

    score = Math.max(0, Math.min(100, score));
    const urgency: LeadUrgency = score >= 75 ? 'hot' : score >= 50 ? 'warm' : 'cold';
    return { score, urgency };
  }

  /** Convenience overload that pulls features directly from a Lead. */
  scoreLead(lead: Pick<Lead, 'phone' | 'email' | 'budgetMax' | 'interestType'> & {
    sourceChannel?: string;
    recentActivityCount?: number;
  }): { score: number; urgency: LeadUrgency } {
    const paidChannels = new Set(['META_AD', 'GOOGLE_AD', 'TIKTOK_AD', 'PORTAL']);
    return this.score({
      hasPhone: Boolean(lead.phone),
      hasEmail: Boolean(lead.email),
      hasBudget: Boolean(lead.budgetMax),
      hasInterest: Boolean(lead.interestType),
      fromPaidSource: Boolean(lead.sourceChannel && paidChannels.has(lead.sourceChannel)),
      recentActivityCount: lead.recentActivityCount ?? 0,
    });
  }
}
