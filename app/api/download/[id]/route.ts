// app/api/download/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDownloadPresignedUrl } from '@/lib/s3'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()

    // id can be a fileId or conversionId
    const { id } = params
    const type = new URL(req.url).searchParams.get('type') ?? 'file'

    let s3Key: string
    let fileName: string

    if (type === 'conversion') {
      const conversion = await prisma.conversion.findFirst({
        where: { id, userId: session.user.id, status: 'COMPLETE' },
        include: { file: { select: { originalName: true } } },
      })
      if (!conversion || !conversion.outputS3Key) {
        return NextResponse.json({ error: 'Conversion not found or not complete' }, { status: 404 })
      }
      s3Key = conversion.outputS3Key
      fileName = `${conversion.file.originalName.replace(/\.[^.]+$/, '')}.${conversion.targetFormat}`
    } else {
      const file = await prisma.file.findFirst({
        where: { id, userId: session.user.id },
      })
      if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      s3Key = file.s3Key
      fileName = file.originalName
    }

    const downloadUrl = await getDownloadPresignedUrl(s3Key, fileName)
    return NextResponse.json({ url: downloadUrl, fileName, expiresIn: 3600 })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
