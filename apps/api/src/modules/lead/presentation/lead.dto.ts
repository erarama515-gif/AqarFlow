import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { InterestType, LeadChannel, LeadStatus } from '@prisma/client';

export class UtmDto {
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() medium?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() campaign?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() term?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
}

export class CreateLeadDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) fullName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationalId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() sourceCode?: string;
  @ApiPropertyOptional({ enum: LeadChannel }) @IsOptional() @IsEnum(LeadChannel) channel?: LeadChannel;

  @ApiPropertyOptional({ enum: InterestType })
  @IsOptional() @IsEnum(InterestType) interestType?: InterestType;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) budgetMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) budgetMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) preferredAreas?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) propertyTypes?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) bedroomsMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ type: UtmDto }) @IsOptional() @ValidateNested() @Type(() => UtmDto) utm?: UtmDto;
  @ApiPropertyOptional() @IsOptional() @IsString() referrerUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() externalId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedToId?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() autoAssign?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class ChangeLeadStatusDto {
  @ApiProperty({ enum: LeadStatus }) @IsEnum(LeadStatus) status!: LeadStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() lostReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class AssignLeadDto {
  @ApiProperty() @IsUUID() userId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class ListLeadsQueryDto {
  @ApiPropertyOptional({ enum: LeadStatus }) @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() sourceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() page?: number;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() limit?: number;
}
