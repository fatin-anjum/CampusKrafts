import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceType, SheetType } from '@prisma/client';
import { IsArray, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateSheetDto {
  @ApiProperty() @IsString() courseId: string;
  @ApiProperty() @IsString() title: string;
  @ApiProperty({ enum: SheetType }) @IsEnum(SheetType) type: SheetType;
  @ApiProperty({ description: 'S3 key from /uploads/presign' }) @IsString() s3Key: string;
  @ApiPropertyOptional() @IsOptional() @IsString() topic?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chapter?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sizeBytes?: number;
}

export class CreateResourceDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty({ enum: ResourceType }) @IsEnum(ResourceType) type: ResourceType;
  @ApiProperty() @IsString() s3Key: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() tags?: string[];
}
