import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ActivityType } from '@prisma/client';

export class CreateActivityDto {
  @ApiProperty({ enum: ActivityType }) @IsEnum(ActivityType) type!: ActivityType;
  @ApiProperty() @IsString() subject!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) durationMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() leadId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() contactId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() dealId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() propertyId?: string;
}

export class CalendarQueryDto {
  @ApiProperty() @IsDateString() from!: string;
  @ApiProperty() @IsDateString() to!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() userId?: string;
}

export class ScheduleViewingDto {
  @ApiProperty() @IsUUID() propertyId!: string;
  @ApiProperty() @IsUUID() contactId!: string;
  @ApiProperty() @IsUUID() agentId!: string;
  @ApiProperty() @IsDateString() scheduledAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(15) @Max(480) durationMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ViewingFeedbackDto {
  @ApiPropertyOptional() @IsOptional() @IsString() feedback?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
}
