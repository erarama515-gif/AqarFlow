import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { PropertyService } from '../application/property.service';
import { MasterProjectService } from '../application/master-project.service';
import { ReservationService } from '../application/reservation.service';
import { PaymentPlanService } from '../application/payment-plan.service';

import {
  AddBuildingDto,
  BulkCreateUnitsDto,
  ChangeInventoryStatusDto,
  ChangePriceDto,
  CreateMasterProjectDto,
  CreatePaymentPlanDto,
  CreatePropertyDto,
  ReserveDto,
  SearchPropertiesQueryDto,
} from './property.dto';

import { RequirePermissions } from '../../iam/decorators/permissions.decorator';
import { PERMISSIONS } from '../../iam/domain/permissions.catalog';

@ApiTags('Properties')
@Controller({ version: '1' })
export class PropertyController {
  constructor(
    private readonly properties: PropertyService,
    private readonly masterProjects: MasterProjectService,
    private readonly reservations: ReservationService,
    private readonly paymentPlans: PaymentPlanService,
  ) {}

  // Properties --------------------------------------------------------------
  @RequirePermissions(PERMISSIONS.PROPERTY_CREATE)
  @Post('properties')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new property' })
  async create(@Body() dto: CreatePropertyDto): Promise<{ id: string }> {
    return {
      id: await this.properties.create({
        ...dto,
        permitExpiry: dto.permitExpiry ? new Date(dto.permitExpiry) : undefined,
      }),
    };
  }

  @RequirePermissions(PERMISSIONS.PROPERTY_READ)
  @Get('properties')
  @ApiOperation({ summary: 'Search & list properties' })
  async list(@Query() q: SearchPropertiesQueryDto, @Res({ passthrough: true }) res: Response) {
    const { items, total } = await this.properties.search(q);
    res.setHeader('X-Total-Count', total.toString());
    return items;
  }

  @RequirePermissions(PERMISSIONS.PROPERTY_READ)
  @Get('properties/:id')
  @ApiOperation({ summary: 'Property detail' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.properties.findById(id);
  }

  @RequirePermissions(PERMISSIONS.PROPERTY_PUBLISH)
  @Post('properties/:id/publish')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Publish a property listing' })
  async publish(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.properties.publish(id);
  }

  @RequirePermissions(PERMISSIONS.PROPERTY_UPDATE)
  @Post('properties/:id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change inventory status' })
  async changeStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ChangeInventoryStatusDto,
  ): Promise<void> {
    await this.properties.changeStatus(id, dto.status, dto.reason);
  }

  @RequirePermissions(PERMISSIONS.PROPERTY_UPDATE)
  @Post('properties/:id/price')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change price (records history)' })
  async changePrice(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ChangePriceDto,
  ): Promise<void> {
    await this.properties.changePrice(id, dto.price, dto.currency, dto.reason);
  }

  // Reservations ------------------------------------------------------------
  @RequirePermissions(PERMISSIONS.PROPERTY_RESERVE)
  @Post('properties/:id/reserve')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reserve a unit (time-limited hold)' })
  async reserve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReserveDto,
  ): Promise<{ reservationId: string }> {
    const reservationId = await this.reservations.reserve({ propertyId: id, ...dto });
    return { reservationId };
  }

  @RequirePermissions(PERMISSIONS.PROPERTY_RESERVE)
  @Post('reservations/:id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel an active reservation' })
  async cancelReservation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { reason?: string },
  ): Promise<void> {
    await this.reservations.cancel(id, body.reason);
  }

  // Master Projects ---------------------------------------------------------
  @RequirePermissions(PERMISSIONS.PROPERTY_CREATE)
  @Post('master-projects')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a master project (developer hierarchy)' })
  async createMasterProject(@Body() dto: CreateMasterProjectDto): Promise<{ id: string }> {
    return { id: await this.masterProjects.create(dto) };
  }

  @RequirePermissions(PERMISSIONS.PROPERTY_READ)
  @Get('master-projects/:id/inventory')
  @ApiOperation({ summary: 'Master project inventory dashboard' })
  async masterProjectInventory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.masterProjects.inventoryDashboard(id);
  }

  @RequirePermissions(PERMISSIONS.PROPERTY_CREATE)
  @Post('master-projects/:id/buildings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a building under a master project' })
  async addBuilding(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddBuildingDto,
  ): Promise<{ id: string }> {
    return { id: await this.masterProjects.addBuilding(id, dto) };
  }

  @RequirePermissions(PERMISSIONS.PROPERTY_CREATE)
  @Post('master-projects/:id/units/bulk')
  @ApiOperation({ summary: 'Bulk create units across floors' })
  async bulkCreateUnits(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: BulkCreateUnitsDto,
  ): Promise<{ created: number }> {
    return this.masterProjects.bulkCreateUnits({ masterProjectId: id, ...dto });
  }

  // Payment Plans -----------------------------------------------------------
  @RequirePermissions(PERMISSIONS.PROPERTY_CREATE)
  @Post('payment-plans')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a payment plan (template or per-property)' })
  async createPaymentPlan(@Body() dto: CreatePaymentPlanDto): Promise<{ id: string }> {
    return { id: await this.paymentPlans.create(dto as any) };
  }
}
