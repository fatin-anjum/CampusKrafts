import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gateway } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({ enum: Gateway }) @IsEnum(Gateway)
  gateway: Gateway;

  @ApiPropertyOptional({ description: 'Set automatically by the enroll route' })
  @IsOptional() @IsString()
  courseId?: string;
}

export class RefundDto {
  @ApiProperty() @IsString()
  reason: string;
}
