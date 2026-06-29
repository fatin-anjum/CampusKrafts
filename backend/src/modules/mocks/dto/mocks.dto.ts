import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MockScope } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateMockDto {
  @ApiProperty({ description: 'Exam this mock wraps' }) @IsString() examId: string;
  @ApiProperty({ enum: MockScope }) @IsEnum(MockScope) scope: MockScope;
  @ApiPropertyOptional() @IsOptional() @IsString() university?: string;
  @ApiProperty({ description: 'ISO datetime' }) @IsString() scheduledAt: string;
  @ApiProperty({ description: 'ISO datetime' }) @IsString() closeAt: string;
}
