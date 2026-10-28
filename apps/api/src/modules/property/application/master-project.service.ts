import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CountryCode, InventoryStatus, ListingType, PropertyType } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { OutboxService } from '../../../shared/outbox/outbox.service';

interface CreateMasterProjectInput {
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  developerName?: string;
  country: CountryCode;
  city?: string;
  district?: string;
  totalUnits?: number;
  isOffPlan?: boolean;
  amenities?: string[];
}

interface BulkCreateUnitsInput {
  masterProjectId: string;
  buildingId: string;
  floorNumbers: number[];
  unitsPerFloor: number;
  unitPrefix?: string;
  propertyType: PropertyType;
  listingType: ListingType;
  basePrice?: number;
  currency?: string;
  bedrooms?: number;
  bathrooms?: number;
  builtArea?: number;
}

@Injectable()
export class MasterProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: TenantContextService,
    private readonly outbox: OutboxService,
  ) {}

  async create(input: CreateMasterProjectInput): Promise<string> {
    const tenantId = this.ctx.requireTenantId();
    const code = input.code.trim().toUpperCase();
    const existing = await this.prisma.masterProject.findFirst({
      where: { tenantId, code, deletedAt: null },
    });
    if (existing) throw new ConflictException('Master project code already exists');

    const project = await this.prisma.masterProject.create({
      data: {
        tenantId,
        code,
        name: input.name,
        nameAr: input.nameAr,
        description: input.description,
        descriptionAr: input.descriptionAr,
        developerName: input.developerName,
        country: input.country,
        city: input.city,
        district: input.district,
        totalUnits: input.totalUnits,
        isOffPlan: input.isOffPlan ?? false,
        amenities: input.amenities ?? [],
      },
    });
    return project.id;
  }

  async addBuilding(masterProjectId: string, input: { code: string; name: string; totalFloors?: number }): Promise<string> {
    const tenantId = this.ctx.requireTenantId();
    const project = await this.prisma.masterProject.findFirst({
      where: { id: masterProjectId, tenantId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Master project not found');

    const building = await this.prisma.building.create({
      data: {
        tenantId,
        masterProjectId,
        code: input.code.trim().toUpperCase(),
        name: input.name,
        totalFloors: input.totalFloors,
      },
    });
    return building.id;
  }

  async bulkCreateUnits(input: BulkCreateUnitsInput): Promise<{ created: number }> {
    const tenantId = this.ctx.requireTenantId();
    const masterProject = await this.prisma.masterProject.findFirst({
      where: { id: input.masterProjectId, tenantId, deletedAt: null },
    });
    if (!masterProject) throw new NotFoundException('Master project not found');

    const building = await this.prisma.building.findFirst({
      where: { id: input.buildingId, tenantId, deletedAt: null },
    });
    if (!building) throw new NotFoundException('Building not found');

    // Materialize floors first
    const floors = await Promise.all(
      input.floorNumbers.map(async (n) => {
        const existing = await this.prisma.floor.findFirst({
          where: { buildingId: input.buildingId, number: n },
        });
        if (existing) return existing;
        return this.prisma.floor.create({
          data: {
            tenantId,
            buildingId: input.buildingId,
            number: n,
            totalUnits: input.unitsPerFloor,
          },
        });
      }),
    );

    // Then create units
    let created = 0;
    for (const floor of floors) {
      for (let u = 1; u <= input.unitsPerFloor; u++) {
        const unitNumber = `${input.unitPrefix ?? ''}${floor.number.toString().padStart(2, '0')}${u
          .toString()
          .padStart(2, '0')}`;
        const referenceCode = `${building.code}-${unitNumber}`;
        await this.prisma.property.create({
          data: {
            tenantId,
            referenceCode,
            masterProjectId: input.masterProjectId,
            buildingId: input.buildingId,
            floorId: floor.id,
            unitNumber,
            propertyType: input.propertyType,
            listingType: input.listingType,
            inventoryStatus: InventoryStatus.AVAILABLE,
            bedrooms: input.bedrooms,
            bathrooms: input.bathrooms,
            builtArea: input.builtArea ? (input.builtArea as any) : undefined,
            price: input.basePrice ? (input.basePrice as any) : undefined,
            currency: input.currency,
            country: masterProject.country,
            city: masterProject.city,
            district: masterProject.district,
            floorNumber: floor.number,
          },
        });
        created++;
      }
    }

    return { created };
  }

  async inventoryDashboard(masterProjectId: string) {
    const tenantId = this.ctx.requireTenantId();
    const project = await this.prisma.masterProject.findFirst({
      where: { id: masterProjectId, tenantId, deletedAt: null },
      include: {
        buildings: {
          include: {
            floors: {
              include: {
                properties: {
                  select: { id: true, unitNumber: true, inventoryStatus: true, price: true, currency: true, bedrooms: true },
                },
              },
            },
            _count: { select: { properties: true } },
          },
        },
        _count: { select: { properties: true } },
      },
    });
    if (!project) throw new NotFoundException('Master project not found');

    // Summary stats
    const all = await this.prisma.property.findMany({
      where: { tenantId, masterProjectId, deletedAt: null },
      select: { inventoryStatus: true, price: true },
    });
    const byStatus: Record<string, number> = {};
    for (const p of all) {
      byStatus[p.inventoryStatus] = (byStatus[p.inventoryStatus] ?? 0) + 1;
    }
    return { project, summary: { total: all.length, byStatus } };
  }
}
