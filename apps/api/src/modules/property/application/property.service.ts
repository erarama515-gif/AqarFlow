import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CountryCode,
  FurnishingStatus,
  InventoryStatus,
  ListingType,
  Prisma,
  PropertyType,
} from '@prisma/client';
import { customAlphabet } from 'nanoid';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { AuditService } from '../../audit/audit.service';
import { OutboxService } from '../../../shared/outbox/outbox.service';

const refCodeGen = customAlphabet('ACDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

export interface CreatePropertyInput {
  propertyType: PropertyType;
  listingType: ListingType;
  titleEn?: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpots?: number;
  builtArea?: number;
  plotArea?: number;
  areaUnit?: string;
  yearBuilt?: number;
  floorNumber?: number;
  furnishing?: FurnishingStatus;
  view?: string;
  orientation?: string;
  amenities?: string[];
  features?: string[];
  price?: number;
  currency?: string;
  rentFrequency?: string;
  serviceCharge?: number;
  isPriceVisible?: boolean;
  country: CountryCode;
  city?: string;
  district?: string;
  address?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  permitNumber?: string;
  permitExpiry?: Date;
  unitNumber?: string;
  masterProjectId?: string;
  buildingId?: string;
  floorId?: string;
  tags?: string[];
}

@Injectable()
export class PropertyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  async create(input: CreatePropertyInput): Promise<string> {
    const tenantId = this.ctx.requireTenantId();
    const userId = this.ctx.userId;
    const referenceCode = `P-${refCodeGen()}`;

    const created = await this.prisma.$transaction(async (tx) => {
      const property = await tx.property.create({
        data: {
          tenantId,
          referenceCode,
          unitNumber: input.unitNumber,
          masterProjectId: input.masterProjectId,
          buildingId: input.buildingId,
          floorId: input.floorId,
          titleEn: input.titleEn,
          titleAr: input.titleAr,
          descriptionEn: input.descriptionEn,
          descriptionAr: input.descriptionAr,
          propertyType: input.propertyType,
          listingType: input.listingType,
          inventoryStatus: InventoryStatus.DRAFT,
          bedrooms: input.bedrooms,
          bathrooms: input.bathrooms,
          parkingSpots: input.parkingSpots,
          builtArea: input.builtArea ? new Prisma.Decimal(input.builtArea) : null,
          plotArea: input.plotArea ? new Prisma.Decimal(input.plotArea) : null,
          areaUnit: input.areaUnit ?? 'sqm',
          yearBuilt: input.yearBuilt,
          floorNumber: input.floorNumber,
          furnishing: input.furnishing,
          view: input.view,
          orientation: input.orientation,
          amenities: input.amenities ?? [],
          features: input.features ?? [],
          price: input.price ? new Prisma.Decimal(input.price) : null,
          currency: input.currency,
          pricePerArea:
            input.price && input.builtArea
              ? new Prisma.Decimal(input.price / input.builtArea)
              : null,
          rentFrequency: input.rentFrequency,
          serviceCharge: input.serviceCharge ? new Prisma.Decimal(input.serviceCharge) : null,
          isPriceVisible: input.isPriceVisible ?? true,
          country: input.country,
          city: input.city,
          district: input.district,
          address: input.address,
          postalCode: input.postalCode,
          latitude: input.latitude ? new Prisma.Decimal(input.latitude) : null,
          longitude: input.longitude ? new Prisma.Decimal(input.longitude) : null,
          permitNumber: input.permitNumber,
          permitExpiry: input.permitExpiry,
          tags: input.tags ?? [],
          createdById: userId,
        },
      });

      await this.outbox.append(tx, {
        tenantId,
        eventType: 'property.created',
        aggregateType: 'property',
        aggregateId: property.id,
        payload: {
          propertyId: property.id,
          referenceCode: property.referenceCode,
          listingType: property.listingType,
        },
      });
      return property;
    });
    return created.id;
  }

  async publish(id: string): Promise<void> {
    const tenantId = this.ctx.requireTenantId();
    const prop = await this.prisma.property.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!prop) throw new NotFoundException('Property not found');

    // Minimum data required to publish: title, price, location, ≥1 media
    const issues: string[] = [];
    if (!prop.titleEn && !prop.titleAr) issues.push('At least one title (EN or AR) is required');
    if (!prop.price) issues.push('Price is required');
    if (!prop.city) issues.push('City is required');
    const mediaCount = await this.prisma.propertyMedia.count({ where: { propertyId: id } });
    if (mediaCount === 0) issues.push('At least one photo is required');
    if (issues.length > 0) {
      throw new BadRequestException({ message: 'Cannot publish', issues });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.property.update({
        where: { id },
        data: {
          isPublished: true,
          publishedAt: new Date(),
          inventoryStatus:
            prop.inventoryStatus === InventoryStatus.DRAFT ? InventoryStatus.AVAILABLE : prop.inventoryStatus,
        },
      });
      await this.outbox.append(tx, {
        tenantId,
        eventType: 'property.published',
        aggregateType: 'property',
        aggregateId: id,
        payload: { propertyId: id },
      });
    });
  }

  async changeStatus(id: string, next: InventoryStatus, reason?: string): Promise<void> {
    const tenantId = this.ctx.requireTenantId();
    const prop = await this.prisma.property.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!prop) throw new NotFoundException('Property not found');

    // Light state-machine validation: cannot go from SOLD to AVAILABLE without an explicit override
    if (prop.inventoryStatus === InventoryStatus.SOLD && next === InventoryStatus.AVAILABLE) {
      throw new BadRequestException('Cannot move SOLD → AVAILABLE without admin override');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.property.update({ where: { id }, data: { inventoryStatus: next } });
      await this.outbox.append(tx, {
        tenantId,
        eventType: 'property.inventory_status_changed',
        aggregateType: 'property',
        aggregateId: id,
        payload: { from: prop.inventoryStatus, to: next, reason },
      });
    });

    await this.audit.record({
      action: 'property.status_changed',
      resourceType: 'property',
      resourceId: id,
      beforeValue: { inventoryStatus: prop.inventoryStatus },
      afterValue: { inventoryStatus: next, reason },
    });
  }

  async changePrice(id: string, newPrice: number, currency: string, reason?: string): Promise<void> {
    const tenantId = this.ctx.requireTenantId();
    const userId = this.ctx.userId;
    const prop = await this.prisma.property.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!prop) throw new NotFoundException('Property not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.propertyPriceChange.create({
        data: {
          propertyId: id,
          oldPrice: prop.price,
          newPrice: new Prisma.Decimal(newPrice),
          currency,
          reason,
          changedById: userId,
        },
      });
      await tx.property.update({
        where: { id },
        data: {
          price: new Prisma.Decimal(newPrice),
          currency,
          pricePerArea: prop.builtArea
            ? new Prisma.Decimal(newPrice / Number(prop.builtArea))
            : null,
        },
      });
      await this.outbox.append(tx, {
        tenantId,
        eventType: 'property.price_changed',
        aggregateType: 'property',
        aggregateId: id,
        payload: { oldPrice: prop.price, newPrice, currency, reason },
      });
    });
  }

  async findById(id: string) {
    const tenantId = this.ctx.requireTenantId();
    const prop = await this.prisma.property.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        owners: { include: { contact: { select: { id: true, fullName: true, phone: true, email: true } } } },
        masterProject: true,
        building: true,
        floor: true,
        paymentPlan: true,
        priceHistory: { orderBy: { changedAt: 'desc' }, take: 50 },
        reservations: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!prop) throw new NotFoundException('Property not found');
    return prop;
  }

  async search(opts: {
    listingType?: ListingType;
    propertyType?: PropertyType;
    inventoryStatus?: InventoryStatus;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    minBeds?: number;
    isPublished?: boolean;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const tenantId = this.ctx.requireTenantId();
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);

    const where: Prisma.PropertyWhereInput = {
      tenantId,
      deletedAt: null,
      listingType: opts.listingType,
      propertyType: opts.propertyType,
      inventoryStatus: opts.inventoryStatus,
      city: opts.city ? { contains: opts.city, mode: 'insensitive' } : undefined,
      bedrooms: opts.minBeds != null ? { gte: opts.minBeds } : undefined,
      price: {
        ...(opts.minPrice != null ? { gte: new Prisma.Decimal(opts.minPrice) } : {}),
        ...(opts.maxPrice != null ? { lte: new Prisma.Decimal(opts.maxPrice) } : {}),
      },
      isPublished: opts.isPublished,
      ...(opts.q
        ? {
            OR: [
              { titleEn: { contains: opts.q, mode: 'insensitive' } },
              { titleAr: { contains: opts.q } },
              { referenceCode: { contains: opts.q.toUpperCase() } },
              { address: { contains: opts.q, mode: 'insensitive' } },
              { district: { contains: opts.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          media: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, thumbnailUrl: true },
          },
        },
      }),
      this.prisma.property.count({ where }),
    ]);
    return { items, total };
  }
}
