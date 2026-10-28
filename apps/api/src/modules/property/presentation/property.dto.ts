import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CountryCode, FurnishingStatus, InventoryStatus, ListingType, PropertyType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePropertyDto {
  @ApiProperty({ enum: PropertyType }) @IsEnum(PropertyType) propertyType!: PropertyType;
  @ApiProperty({ enum: ListingType }) @IsEnum(ListingType) listingType!: ListingType;
  @ApiProperty({ enum: CountryCode }) @IsEnum(CountryCode) country!: CountryCode;

  @ApiPropertyOptional() @IsOptional() @IsString() titleEn?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() titleAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionEn?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionAr?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) bedrooms?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) bathrooms?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) parkingSpots?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) builtArea?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) plotArea?: number;
  @ApiPropertyOptional({ default: 'sqm' }) @IsOptional() @IsString() areaUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1800) yearBuilt?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() floorNumber?: number;

  @ApiPropertyOptional({ enum: FurnishingStatus })
  @IsOptional() @IsEnum(FurnishingStatus) furnishing?: FurnishingStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() view?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() orientation?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) amenities?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) price?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rentFrequency?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) serviceCharge?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPriceVisible?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() permitNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() permitExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unitNumber?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() masterProjectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() buildingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() floorId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class SearchPropertiesQueryDto {
  @ApiPropertyOptional({ enum: ListingType }) @IsOptional() @IsEnum(ListingType) listingType?: ListingType;
  @ApiPropertyOptional({ enum: PropertyType }) @IsOptional() @IsEnum(PropertyType) propertyType?: PropertyType;
  @ApiPropertyOptional({ enum: InventoryStatus }) @IsOptional() @IsEnum(InventoryStatus) inventoryStatus?: InventoryStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() minBeds?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
}

export class ChangeInventoryStatusDto {
  @ApiProperty({ enum: InventoryStatus }) @IsEnum(InventoryStatus) status!: InventoryStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class ChangePriceDto {
  @ApiProperty() @IsNumber() @Min(0) price!: number;
  @ApiProperty() @IsString() currency!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class ReserveDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() leadId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional({ default: 24 }) @IsOptional() @IsInt() @Min(1) expiresInHours?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateMasterProjectDto {
  @ApiProperty() @IsString() @MinLength(1) code!: string;
  @ApiProperty() @IsString() @MinLength(2) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nameAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descriptionAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() developerName?: string;
  @ApiProperty({ enum: CountryCode }) @IsEnum(CountryCode) country!: CountryCode;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) totalUnits?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isOffPlan?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) amenities?: string[];
}

export class AddBuildingDto {
  @ApiProperty() @IsString() code!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) totalFloors?: number;
}

export class BulkCreateUnitsDto {
  @ApiProperty() @IsUUID() buildingId!: string;
  @ApiProperty({ type: [Number] }) @IsArray() @IsInt({ each: true }) floorNumbers!: number[];
  @ApiProperty() @IsInt() @Min(1) unitsPerFloor!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unitPrefix?: string;
  @ApiProperty({ enum: PropertyType }) @IsEnum(PropertyType) propertyType!: PropertyType;
  @ApiProperty({ enum: ListingType }) @IsEnum(ListingType) listingType!: ListingType;
  @ApiPropertyOptional() @IsOptional() @IsNumber() basePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() bedrooms?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() bathrooms?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() builtArea?: number;
}

export class CreatePaymentPlanDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isTemplate?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() downPaymentPct?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() postHandoverYears?: number;
  @ApiProperty({ type: 'array' }) @IsArray() installments!: unknown[];
}
