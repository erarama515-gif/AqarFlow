import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateContactDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) fullName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fullNameAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationalId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationalIdType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBuyer?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isTenant?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isLandlord?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isInvestor?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() preferredChannel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() district?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];
}

export class UpdateContactDto extends CreateContactDto {}

export class ListContactsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() role?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() page?: number;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() limit?: number;
}
