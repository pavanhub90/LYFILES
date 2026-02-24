// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getUploadPresignedUrl, buildS3Key } from '@/lib/s3'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { createHash } from 'crypto'

const schema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().min(1),
})

// Map MIME types to categories
function getCategory(mimeType: string, ext: string) {
  if (mimeType.startsWith('image/')) return 'IMAGES'
  if (mimeType.startsWith('video/')) return 'VIDEOS'
  if (mimeType.startsWith('audio/')) return 'AUDIO'
  if (['application/pdf','application/msword','application/vnd.openxmlformats','text/'].some(t => mimeType.startsWith(t))) return 'DOCUMENTS'
  if (['zip','rar','tar','gz','7z'].includes(ext)) return 'ARCHIVES'
  return 'OTHER'
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { fileName, mimeType, size } = parsed.data
    const ext = fileName.split('.').pop()?.toLowerCase() ?? ''

    // Plan-based size limits
    const maxSize = session.user.plan === 'FREE' ? 100 * 1024 * 1024 : 2 * 1024 * 1024 * 1024
    if (size > maxSize) {
      return NextResponse.json(
        { error: `File too large. ${session.user.plan === 'FREE' ? 'Free plan: 100MB max. Upgrade to Pro for 2GB.' : '2GB max.'}` },
        { status: 413 }
      )
    }

    const storedName = `${uuid()}.${ext}`
    const category = getCategory(mimeType, ext)
    const s3Key = buildS3Key(session.user.id, category, storedName)

    // Generate pre-signed URL
    const uploadUrl = await getUploadPresignedUrl(s3Key, mimeType)

    // Create file record (status pending — confirmed after upload)
    const file = await prisma.file.create({
      data: {
        userId: session.user.id,
        originalName: fileName,
        storedName,
        originalFormat: ext,
        mimeType,
        category: category as 'DOCUMENTS' | 'IMAGES' | 'VIDEOS' | 'AUDIO' | 'ARCHIVES' | 'OTHER',
        s3Key,
        s3Bucket: process.env.S3_BUCKET_NAME!,
        size,
        hash: createHash('sha256').update(`${session.user.id}-${fileName}-${size}`).digest('hex'),
        expiresAt: session.user.plan === 'FREE'
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  // 7 days
          : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
    })

    return NextResponse.json({ uploadUrl, fileId: file.id, s3Key })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[upload] Error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
