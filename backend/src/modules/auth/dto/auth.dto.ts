import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { OtpPurpose } from '@prisma/client';

export class RegisterDto {
  @ApiProperty() @IsString() @MinLength(2)
  name: string;

  @ApiPropertyOptional() @ValidateIf((o) => !o.phone) @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'BD phone, e.g. 01712345678' })
  @ValidateIf((o) => !o.email) @IsString()
  phone?: string;

  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8)
  password: string;
}

export class LoginDto {
  @ApiPropertyOptional() @ValidateIf((o) => !o.phone) @IsString()
  email?: string;

  @ApiPropertyOptional() @ValidateIf((o) => !o.email) @IsString()
  phone?: string;

  @ApiProperty() @IsString()
  password: string;
}

export class VerifyOtpDto {
  @ApiProperty() @IsString()
  identifier: string; // email or phone

  @ApiProperty() @IsString()
  code: string;

  @ApiProperty({ enum: OtpPurpose }) @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}

export class RefreshDto {
  @ApiProperty() @IsString()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty() @IsString()
  identifier: string;
}

export class ResetPasswordDto {
  @ApiProperty() @IsString()
  identifier: string;

  @ApiProperty() @IsString()
  code: string;

  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8)
  newPassword: string;
}

export class GoogleOAuthDto {
  @ApiProperty({ description: 'Google ID token from the client' })
  @IsString()
  idToken: string;
}
