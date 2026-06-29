import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty() @IsString() @MinLength(2)
  name: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  phone?: string;

  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8)
  password: string;

  @ApiProperty({ enum: Role }) @IsEnum(Role)
  role: Role;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isBanned?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isVerified?: boolean;
}
