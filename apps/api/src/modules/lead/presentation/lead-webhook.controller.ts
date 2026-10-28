import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import { LeadService } from '../application/lead.service';
import { Public } from '../../iam/decorators/permissions.decorator';

/**
 * Public webhook endpoint for partner integrations to push leads.
 *
 * Each tenant configures a LeadSource with a webhook_key. The URL becomes:
 *   POST /api/v1/webhooks/leads/{tenantSubdomain}/{sourceCode}
 *   header: X-Webhook-Key: <the configured webhook_key>
 *
 * Payload is flexible — only `fullName` and (phone OR email) are required.
 * Anything we don't recognise is preserved on `raw_payload` for later
 * reconciliation.
 */
@ApiTags('Webhooks')
@Controller({ path: 'webhooks/leads', version: '1' })
export class LeadWebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leads: LeadService,
  ) {}

  @Public()
  @Post(':tenantSubdomain/:sourceCode')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Public webhook for partner-supplied leads' })
  async ingest(
    @Param('tenantSubdomain') subdomain: string,
    @Param('sourceCode') sourceCode: string,
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ): Promise<{ leadId: string; duplicate: boolean }> {
    // 1. Resolve tenant + source
    const tenant = await this.prisma.tenant.findFirst({
      where: { subdomain: subdomain.toLowerCase(), deletedAt: null },
      select: { id: true },
    });
    if (!tenant) throw new UnauthorizedException('Unknown tenant');

    const source = await this.prisma.leadSource.findFirst({
      where: { tenantId: tenant.id, code: sourceCode, isActive: true },
    });
    if (!source) throw new UnauthorizedException('Unknown or inactive source');

    // 2. Validate webhook key
    const presented = req.headers['x-webhook-key'];
    if (!source.webhookKey || presented !== source.webhookKey) {
      throw new UnauthorizedException('Invalid webhook key');
    }

    // 3. Extract fields we recognise (case-insensitive on a few common names)
    const fullName =
      pickString(body, 'fullName', 'full_name', 'name') ??
      [pickString(body, 'firstName', 'first_name'), pickString(body, 'lastName', 'last_name')]
        .filter(Boolean)
        .join(' ')
        .trim();

    const phone = pickString(body, 'phone', 'phone_number', 'mobile', 'whatsapp');
    const email = pickString(body, 'email', 'email_address');

    if (!fullName) {
      throw new BadRequestException('fullName (or firstName+lastName) is required');
    }
    if (!phone && !email) {
      throw new BadRequestException('phone or email is required');
    }

    const result = await this.leads.capture(tenant.id, {
      fullName,
      phone,
      email,
      nationalId: pickString(body, 'nationalId', 'national_id', 'id_number'),
      sourceCode: source.code,
      channel: source.channel,
      notes: pickString(body, 'notes', 'message'),
      utm: {
        source: pickString(body, 'utm_source'),
        medium: pickString(body, 'utm_medium'),
        campaign: pickString(body, 'utm_campaign'),
        term: pickString(body, 'utm_term'),
        content: pickString(body, 'utm_content'),
      },
      referrerUrl: pickString(body, 'referrerUrl', 'referrer_url'),
      externalId: pickString(body, 'externalId', 'external_id', 'id'),
      rawPayload: body,
    });

    return { leadId: result.id, duplicate: result.duplicate };
  }
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return undefined;
}
