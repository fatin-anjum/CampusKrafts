import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamMode, ExamType, QuestionType } from '@prisma/client';
import {
  IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExamDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  courseId?: string;

  @ApiProperty() @IsString()
  title: string;

  @ApiProperty({ enum: ExamType }) @IsEnum(ExamType)
  type: ExamType;

  @ApiProperty({ enum: ExamMode }) @IsEnum(ExamMode)
  mode: ExamMode;

  @ApiProperty() @IsInt() @Min(60)
  durationSec: number;

  @ApiPropertyOptional({ description: '0..1, e.g. 0.25' }) @IsOptional() @IsNumber() @Min(0) @Max(1)
  negativeMarkRatio?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() shuffleQuestions?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shuffleOptions?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() secureMode?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() opensAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() closesAt?: string;
}

class AttachItem {
  @ApiProperty() @IsString() questionId: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() marks?: number;
}
export class AttachQuestionsDto {
  @ApiProperty({ type: [AttachItem] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => AttachItem)
  questions: AttachItem[];
}

export class SaveAnswerDto {
  @ApiProperty() @IsString()
  questionId: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  selectedOptionId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  answerText?: string;
}

export class GradeWrittenDto {
  @ApiProperty() @IsString() responseId: string;
  @ApiProperty() @IsNumber() awardedMarks: number;
}

class OptionDto {
  @ApiProperty() @IsString() label: string;
  @ApiProperty() @IsString() text: string;
  @ApiProperty() @IsBoolean() isCorrect: boolean;
}
export class CreateQuestionDto {
  @ApiProperty() @IsString() subject: string;
  @ApiProperty() @IsString() topic: string;
  @ApiProperty() @IsInt() @Min(1) @Max(5) difficulty: number;
  @ApiProperty() @IsString() stem: string;
  @ApiProperty({ enum: QuestionType }) @IsEnum(QuestionType) type: QuestionType;
  @ApiPropertyOptional() @IsOptional() @IsString() explanation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() correctText?: string;
  @ApiPropertyOptional({ type: [OptionDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OptionDto)
  options?: OptionDto[];
}
