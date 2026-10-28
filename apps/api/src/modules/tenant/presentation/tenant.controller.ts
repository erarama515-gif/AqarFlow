import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { TenantService } from '../application/tenant.service';
import { BranchService } from '../application/branch.service';
import { CheckSubdomainDto, CreateBranchDto, SignupTenantDto } from './tenant.dto';
import { Public, RequirePermissions, Authenticated } from '../../iam/decorators/permissions.decorator';
import { PERMISSIONS } from '../../iam/domain/permissions.catalog';

@ApiTags('Tenant')
@Controller({ version: '1' })
export class TenantController {
  constructor(
    private readonly tenants: TenantService,
    private readonly branches: BranchService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public signup endpoints
  // ---------------------------------------------------------------------------
  @Public()
  @Post('tenants/signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tenant and owner user' })
  async signup(@Body() dto: SignupTenantDto): Promise<{ tenantId: string; ownerId: string }> {
    const { tenantId, ownerId } = await this.tenants.signup(dto);
    return { tenantId, ownerId };
  }

  @Public()
  @Get('tenants/check-subdomain')
  @ApiOperation({ summary: 'Check if a subdomain is available' })
  async checkSubdomain(@Query() q: CheckSubdomainDto): Promise<{ available: boolean; reason?: string }> {
    return this.tenants.checkSubdomain(q.value);
  }

  // ---------------------------------------------------------------------------
  // Authenticated endpoints — current tenant context
  // ---------------------------------------------------------------------------
  @Authenticated()
  @Get('tenants/current')
  @ApiOperation({ summary: 'Get the current tenant' })
  async getCurrent(): Promise<unknown> {
    return this.tenants.findCurrent();
  }

  @RequirePermissions(PERMISSIONS.BRANCH_READ)
  @Get('branches')
  @ApiOperation({ summary: 'List branches' })
  async listBranches(): Promise<unknown[]> {
    return this.branches.list();
  }

  @RequirePermissions(PERMISSIONS.BRANCH_CREATE)
  @Post('branches')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new branch' })
  async createBranch(@Body() dto: CreateBranchDto): Promise<{ id: string }> {
    return { id: await this.branches.create(dto) };
  }

  @RequirePermissions(PERMISSIONS.BRANCH_READ)
  @Get('branches/:id')
  @ApiOperation({ summary: 'Get a branch by id' })
  async getBranch(@Param('id', new ParseUUIDPipe()) id: string): Promise<unknown> {
    return this.branches.findById(id);
  }
}
