import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority, TicketStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ description: 'PAYMENT | TECHNICAL | ACADEMIC | OTHER' }) @IsString()
  category: string;

  @ApiProperty() @IsString()
  subject: string;

  @ApiPropertyOptional({ enum: TicketPriority }) @IsOptional() @IsEnum(TicketPriority)
  priority?: TicketPriority;
}

export class AssignTicketDto {
  @ApiProperty() @IsString() assigneeId: string;
}

export class UpdateStatusDto {
  @ApiProperty({ enum: TicketStatus }) @IsEnum(TicketStatus) status: TicketStatus;
}

export class TicketMessageDto {
  @ApiProperty() @IsString() body: string;
  @ApiPropertyOptional() @IsOptional() @IsString() attachmentS3Key?: string;
}
