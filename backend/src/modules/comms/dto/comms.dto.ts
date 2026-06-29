import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export interface Audience {
  all?: boolean;
  roles?: string[];
  courseId?: string;
}

export class CreateAnnouncementDto {
  @ApiProperty() @IsString()
  title: string;

  @ApiProperty() @IsString()
  body: string;

  @ApiPropertyOptional({ description: '{ all: true } or { roles: ["STUDENT"] }' })
  @IsOptional() @IsObject()
  audience?: Audience;
}

export class DeviceTokenDto {
  @ApiProperty() @IsString() token: string;
  @ApiProperty({ description: 'android | ios | web' }) @IsString() platform: string;
}
