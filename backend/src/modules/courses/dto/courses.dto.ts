import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { LessonType } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty() @IsString() @MinLength(3)
  title: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0)
  priceBdt?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  thumbnailUrl?: string;
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class CreateModuleDto {
  @ApiProperty() @IsString()
  title: string;

  @ApiPropertyOptional() @IsOptional() @IsInt()
  order?: number;
}

export class CreateLessonDto {
  @ApiProperty() @IsString()
  title: string;

  @ApiProperty({ enum: LessonType }) @IsEnum(LessonType)
  type: LessonType;

  @ApiPropertyOptional() @IsOptional() @IsInt()
  order?: number;

  @ApiPropertyOptional() @IsOptional() @IsString()
  videoUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt()
  durationSec?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isFreePreview?: boolean;
}

export class SaveProgressDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0)
  lastPositionSec?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  completed?: boolean;
}
