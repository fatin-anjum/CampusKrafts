import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { IsString } from 'class-validator';
import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';

class PresignDto {
  @IsString() filename: string;
  @IsString() contentType: string;
}

/**
 * Issues S3 presigned PUT URLs so clients upload large files (videos, PDFs)
 * directly to S3 without proxying bytes through the API.
 *
 * Production: use @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner to sign.
 * The returned `s3Key` is what you persist on LectureSheet/Resource/etc.
 */
@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly config: ConfigService) {}

  @Post('presign') @Roles(Role.TEACHER, Role.ADMIN, Role.MODERATOR)
  presign(@Body() dto: PresignDto) {
    const bucket = this.config.get<string>('s3.bucket');
    const region = this.config.get<string>('s3.region');
    const ttl = this.config.get<number>('s3.signedUrlTtl');
    const ext = dto.filename.includes('.') ? dto.filename.split('.').pop() : 'bin';
    const s3Key = `uploads/${new Date().getFullYear()}/${randomUUID()}.${ext}`;

    // Placeholder URL — replace with a real presigned URL in production.
    const uploadUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
    return { uploadUrl, s3Key, method: 'PUT', headers: { 'Content-Type': dto.contentType }, expiresInSec: ttl };
  }
}
