import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty() @IsString() courseId: string;
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() attachmentS3Key?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dueAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() maxMarks?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoGrade?: boolean;
}

export class SubmitDto {
  @ApiPropertyOptional() @IsOptional() @IsString() fileS3Key?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() text?: string;
}

export class GradeSubmissionDto {
  @ApiProperty() @IsNumber() marks: number;
  @ApiPropertyOptional() @IsOptional() @IsString() feedback?: string;
}
