import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'agent@aqarflow.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({
    description:
      'Tenant subdomain. Required only when the same email exists across multiple tenants.',
    example: 'acme',
  })
  @IsOptional()
  @IsString()
  tenantHint?: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class TokenResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty() expiresIn!: number;
  @ApiProperty({ required: false }) user?: {
    id: string;
    email: string;
    tenantId: string;
    roles: string[];
  };
}
