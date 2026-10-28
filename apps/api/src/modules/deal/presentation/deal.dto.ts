import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealStatus } from '@prisma/client';
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateDealDto {
  @ApiProperty() @IsString() @MinLength(2) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pipelineCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedCloseAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() buyerContactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() sellerContactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() propertyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() sourceLeadId?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class MoveStageDto {
  @ApiProperty() @IsString() toStageCode!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ListDealsQueryDto {
  @ApiPropertyOptional({ enum: DealStatus }) @IsOptional() @IsEnum(DealStatus) status?: DealStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() ownerId?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() page?: number;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() limit?: number;
}
