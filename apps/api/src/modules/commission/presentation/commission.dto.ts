import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, IsUUID, Max, Min, MinLength, ValidateNested } from 'class-validator';

export class CommissionSplitDto {
  @ApiProperty({ enum: ['PRIMARY_AGENT', 'CO_AGENT', 'REFERRER', 'BROKERAGE', 'MANAGER_OVERRIDE'] })
  @IsString()
  @IsIn(['PRIMARY_AGENT', 'CO_AGENT', 'REFERRER', 'BROKERAGE', 'MANAGER_OVERRIDE'])
  role!: 'PRIMARY_AGENT' | 'CO_AGENT' | 'REFERRER' | 'BROKERAGE' | 'MANAGER_OVERRIDE';

  @ApiProperty({ description: 'Percentage of total commission (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  pct!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  recipientUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  recipientContactId?: string;
}

export class CreateCommissionRuleDto {
  @ApiProperty() @IsString() @MinLength(1) code!: string;
  @ApiProperty() @IsString() @MinLength(2) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ type: Object }) @IsObject() conditions!: Record<string, unknown>;
  @ApiProperty({ type: Object }) @IsObject() calculation!: Record<string, unknown>;

  @ApiProperty({ type: [CommissionSplitDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CommissionSplitDto)
  splits!: CommissionSplitDto[];

  @ApiPropertyOptional() @IsOptional() @IsNumber() vatRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() clawbackDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() priority?: number;
}

export class ListCommissionsQueryDto {
  @ApiPropertyOptional({ enum: CommissionStatus }) @IsOptional() @IsEnum(CommissionStatus) status?: CommissionStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() recipientUserId?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() page?: number;
  @ApiPropertyOptional({ default: 50 }) @IsOptional() limit?: number;
}

export class MarkPaidDto {
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentRef?: string;
}
