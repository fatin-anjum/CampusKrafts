import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LiveProvider } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ScheduleLiveClassDto {
  @ApiProperty() @IsString() courseId: string;
  @ApiProperty() @IsString() title: string;
  @ApiProperty({ enum: LiveProvider }) @IsEnum(LiveProvider) provider: LiveProvider;
  @ApiProperty({ description: 'ISO datetime' }) @IsString() startAt: string;
  @ApiProperty({ description: 'ISO datetime' }) @IsString() endAt: string;
  @ApiPropertyOptional({ description: 'Zoom/Meet URL when provider is external' }) @IsOptional() @IsString() joinUrl?: string;
}

export class AttendanceDto {
  @ApiPropertyOptional({ description: 'true when leaving the class' }) @IsOptional() leaving?: boolean;
}

export class EndClassDto {
  @ApiPropertyOptional() @IsOptional() @IsString() recordingUrl?: string;
}
