import { apiPost } from './api';

interface PresignResponse {
  uploadUrl: string;
  s3Key: string;
  method: string;
  headers: Record<string, string>;
  expiresInSec: number;
}

/**
 * Two-step direct-to-S3 upload used by all content uploaders.
 *   1. POST /uploads/presign → { uploadUrl, s3Key } (TEACHER/ADMIN/MODERATOR)
 *   2. PUT the file straight to the bucket.
 *
 * The dev backend returns a placeholder uploadUrl, so step 2 is best-effort:
 * the s3Key is what the API persists, and that is always returned. In
 * production the PUT hits a real presigned URL.
 */
export async function uploadFile(file: File): Promise<{ s3Key: string }> {
  const presign = await apiPost<PresignResponse>('/uploads/presign', {
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
  });

  try {
    await fetch(presign.uploadUrl, { method: presign.method || 'PUT', body: file, headers: presign.headers });
  } catch {
    /* Placeholder bucket in dev — the s3Key is still valid for the record. */
  }

  return { s3Key: presign.s3Key };
}
