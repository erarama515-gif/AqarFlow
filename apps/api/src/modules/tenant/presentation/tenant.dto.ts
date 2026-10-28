import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CountryCode } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SignupTenantDto {
  @ApiProperty({ example: 'Acme Real Estate' })
  @IsString() @MinLength(2) @MaxLength(100)
  tenantName!: string;

  @ApiProperty({ example: 'acme', description: 'Lowercase, 3-30 chars, must start with letter' })
  @IsString()
  @Matches(/^[a-z][a-z0-9-]{2,29}$/, {
    message: 'Subdomain must start with a letter and contain 3-30 lowercase letters, digits, or hyphens',
  })
  subdomain!: string;

  @ApiProperty({ enum: CountryCode, example: 'SA' })
  @IsEnum(CountryCode)
  country!: CountryCode;

  @ApiProperty() @IsEmail() ownerEmail!: string;
  @ApiProperty() @IsString() @MinLength(8) ownerPassword!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) ownerFirstName!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) ownerLastName!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() ownerPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() locale?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
}

export class CheckSubdomainDto {
  @ApiProperty() @IsString() value!: string;
}

export class CreateBranchDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(20) code!: string;
  @ApiProperty({ enum: CountryCode }) @IsEnum(CountryCode) country!: CountryCode;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
}
