// app/api/files/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteObject } from '@/lib/s3'

// GET: list user's files with pagination & filtering
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20'))
    const category = searchParams.get('category')?.toUpperCase()
    const sort = searchParams.get('sort') ?? 'createdAt'
    const order = searchParams.get('order') ?? 'desc'
    const search = searchParams.get('q')

    const where = {
      userId: session.user.id,
      ...(category ? { category: category as 'DOCUMENTS' | 'IMAGES' | 'VIDEOS' | 'AUDIO' | 'ARCHIVES' } : {}),
      ...(search ? { originalName: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          originalName: true,
          originalFormat: true,
          category: true,
          size: true,
          mimeType: true,
          metadata: true,
          createdAt: true,
          expiresAt: true,
          conversions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, status: true, targetFormat: true, completedAt: true },
          },
        },
      }),
      prisma.file.count({ where }),
    ])

    return NextResponse.json({
      files,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// DELETE: delete a file and all its conversions
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('id')

    if (!fileId) return NextResponse.json({ error: 'Missing file id' }, { status: 400 })

    const file = await prisma.file.findFirst({
      where: { id: fileId, userId: session.user.id },
      include: { conversions: { select: { outputS3Key: true } } },
    })

    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    // Delete from S3
    await deleteObject(file.s3Key)
    for (const conv of file.conversions) {
      if (conv.outputS3Key) await deleteObject(conv.outputS3Key).catch(() => {})
    }

    // Delete from DB (cascades to conversions)
    await prisma.file.delete({ where: { id: fileId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
