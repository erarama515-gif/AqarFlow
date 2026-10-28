import { Injectable } from '@nestjs/common';
import { InventoryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';

export interface MatchResult {
  propertyId: string;
  score: number;
  reasons: string[];
}

/**
 * MatchingService
 *
 * Pure rule-based matcher (no AI). Given a lead's preferences we produce
 * a ranked list of available properties. Each factor contributes weighted
 * points and an explanatory reason that the UI can show to the agent.
 *
 * Weights (tunable per tenant later):
 *   - Budget within range:        30
 *   - Property type match:        20
 *   - City/area match:            20
 *   - Bedrooms ≥ minimum:         15
 *   - Listing type alignment:     10
 *   - Recency (created in 30d):    5
 */
@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: TenantContextService,
  ) {}

  async matchForLead(leadId: string, limit = 10): Promise<MatchResult[]> {
    const tenantId = this.ctx.requireTenantId();
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId, deletedAt: null },
    });
    if (!lead) return [];

    // Pre-filter — only published, available, same currency (best effort).
    const where: Prisma.PropertyWhereInput = {
      tenantId,
      deletedAt: null,
      isPublished: true,
      inventoryStatus: InventoryStatus.AVAILABLE,
      ...(lead.propertyTypes.length ? { propertyType: { in: lead.propertyTypes as any[] } } : {}),
      ...(lead.budgetMax
        ? {
            price: {
              lte: lead.budgetMax,
              ...(lead.budgetMin ? { gte: lead.budgetMin } : {}),
            },
          }
        : {}),
    };

    const candidates = await this.prisma.property.findMany({
      where,
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    const ranked: MatchResult[] = candidates.map((p) => {
      let score = 0;
      const reasons: string[] = [];

      // Budget
      if (lead.budgetMax && p.price) {
        const price = Number(p.price);
        const max = Number(lead.budgetMax);
        const min = lead.budgetMin ? Number(lead.budgetMin) : 0;
        if (price <= max && price >= min) {
          score += 30;
          reasons.push('Within budget');
        }
      }
      // Type
      if (lead.propertyTypes.includes(p.propertyType)) {
        score += 20;
        reasons.push('Type matches preference');
      }
      // Area
      if (lead.preferredAreas.length && p.city && lead.preferredAreas.some((a) => p.city?.includes(a) || (p.district ?? '').includes(a))) {
        score += 20;
        reasons.push('Area matches preference');
      }
      // Bedrooms
      if (lead.bedroomsMin != null && p.bedrooms != null && p.bedrooms >= lead.bedroomsMin) {
        score += 15;
        reasons.push(`Has ${p.bedrooms}+ bedrooms`);
      }
      // Listing type vs interest
      if (lead.interestType === 'BUY' && (p.listingType === 'SALE' || p.listingType === 'RESALE')) {
        score += 10;
        reasons.push('Listing is for sale');
      } else if (lead.interestType === 'RENT' && p.listingType === 'RENT') {
        score += 10;
        reasons.push('Listing is for rent');
      } else if (lead.interestType === 'INVEST' && p.listingType === 'OFF_PLAN_SALE') {
        score += 10;
        reasons.push('Off-plan investment opportunity');
      }
      // Recency
      if (now - p.createdAt.getTime() < 30 * 24 * 60 * 60 * 1000) {
        score += 5;
        reasons.push('Recently listed');
      }

      return { propertyId: p.id, score, reasons };
    });

    return ranked
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async matchForProperty(propertyId: string, limit = 10) {
    const tenantId = this.ctx.requireTenantId();
    const prop = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId, deletedAt: null },
    });
    if (!prop) return [];

    const leads = await this.prisma.lead.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ['NEW', 'CONTACTED', 'QUALIFIED'] as any[] },
        OR: [
          { budgetMax: prop.price ? { gte: prop.price } : undefined },
          { propertyTypes: { has: prop.propertyType } },
        ],
      },
      take: 200,
    });

    return leads
      .map((lead) => {
        let score = 0;
        const reasons: string[] = [];
        if (lead.budgetMax && prop.price && Number(prop.price) <= Number(lead.budgetMax)) {
          score += 30; reasons.push('Lead budget covers price');
        }
        if (lead.propertyTypes.includes(prop.propertyType)) {
          score += 20; reasons.push('Type matches lead interest');
        }
        if (prop.city && lead.preferredAreas.some((a) => prop.city?.includes(a))) {
          score += 20; reasons.push('Area matches lead');
        }
        if (lead.bedroomsMin != null && prop.bedrooms != null && prop.bedrooms >= lead.bedroomsMin) {
          score += 15; reasons.push('Enough bedrooms');
        }
        return { leadId: lead.id, score, reasons };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
