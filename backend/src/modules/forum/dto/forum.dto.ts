import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateThreadDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() body: string;
  @ApiPropertyOptional() @IsOptional() @IsString() courseId?: string;
}

export class CreatePostDto {
  @ApiProperty() @IsString() body: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string;
}

export class VoteDto {
  @ApiProperty({ description: '+1 or -1' }) @IsInt() value: number;
}
