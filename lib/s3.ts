// lib/s3.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  region: process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  // Cloudflare R2 endpoint (optional)
  ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
})

const BUCKET = process.env.S3_BUCKET_NAME!

// ── Generate a pre-signed upload URL (5 min expiry)
export async function getUploadPresignedUrl(
  key: string,
  contentType: string,
  maxSizeMB = 100
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    // Enforce max size via S3 policy
    Metadata: { 'max-size': String(maxSizeMB * 1024 * 1024) },
  })
  return getSignedUrl(s3, command, { expiresIn: 300 }) // 5 minutes
}

// ── Generate a pre-signed download URL (1 hr expiry)
export async function getDownloadPresignedUrl(key: string, filename?: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ...(filename
      ? { ResponseContentDisposition: `attachment; filename="${filename}"` }
      : {}),
  })
  return getSignedUrl(s3, command, { expiresIn: 3600 }) // 1 hour
}

// ── Check if object exists
export async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return true
  } catch {
    return false
  }
}

// ── Delete object
export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

// ── Build S3 key for user uploads
export function buildS3Key(userId: string, category: string, filename: string): string {
  const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  return `users/${userId}/${category.toLowerCase()}/${date}/${filename}`
}

export { s3, BUCKET }
