import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MatchingService } from '../application/matching.service';
import { RequirePermissions } from '../../iam/decorators/permissions.decorator';
import { PERMISSIONS } from '../../iam/domain/permissions.catalog';

@ApiTags('Matching')
@Controller({ version: '1' })
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @RequirePermissions(PERMISSIONS.LEAD_READ_OWN)
  @Get('leads/:id/matches')
  @ApiOperation({ summary: 'Suggested properties for a lead' })
  async matchesForLead(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('limit') limit?: string,
  ) {
    return this.matching.matchForLead(id, limit ? parseInt(limit, 10) : 10);
  }

  @RequirePermissions(PERMISSIONS.PROPERTY_READ)
  @Get('properties/:id/matches')
  @ApiOperation({ summary: 'Suggested leads for a property' })
  async matchesForProperty(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('limit') limit?: string,
  ) {
    return this.matching.matchForProperty(id, limit ? parseInt(limit, 10) : 10);
  }
}
