import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingPaymentMethod, BookingStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty() @IsUUID() propertyId!: string;
  @ApiProperty() @IsUUID() contactId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() agentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() leadId?: string;

  @ApiProperty({ description: 'Unit price' })
  @IsNumber() @Min(1) unitPrice!: number;

  @ApiProperty({ description: 'Booking fee (deposit)' })
  @IsNumber() @Min(0) bookingFee!: number;

  @ApiProperty() @IsString() @MinLength(3) currency!: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() paymentPlanId?: string;

  @ApiPropertyOptional({ default: 72, description: 'Hours within which the fee must arrive' })
  @IsOptional() @IsInt() @Min(1) @Max(720) paymentDueInHours?: number;

  @ApiPropertyOptional({ default: 21, description: 'Days within which the SPA must be signed' })
  @IsOptional() @IsInt() @Min(1) @Max(365) spaDueInDays?: number;

  @ApiPropertyOptional({ default: 7, description: 'Days during which a refund is allowed' })
  @IsOptional() @IsInt() @Min(0) @Max(60) coolingOffDays?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class RecordPaymentDto {
  @ApiProperty({ enum: BookingPaymentMethod })
  @IsEnum(BookingPaymentMethod)
  method!: BookingPaymentMethod;

  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() receivedAt?: string;
}

export class CancelBookingDto {
  @ApiProperty() @IsString() @MinLength(3) reason!: string;
}

export class ListBookingsQueryDto {
  @ApiPropertyOptional({ enum: BookingStatus }) @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() agentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() propertyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() contactId?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() page?: number;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() limit?: number;
}
