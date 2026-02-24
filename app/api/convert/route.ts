// app/api/convert/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { queueConversion } from '@/lib/queue'
import { buildS3Key } from '@/lib/s3'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'

const ALLOWED_FORMATS = ['pdf','docx','doc','xlsx','csv','txt','png','jpg','jpeg','webp','mp4','mp3','wav','flac','gif','avif'] as const

const schema = z.object({
  fileId: z.string().cuid(),
  targetFormat: z.enum(ALLOWED_FORMATS),
  options: z.object({
    quality: z.number().min(1).max(100).optional(),
    resolution: z.string().optional(),
  }).optional(),
  scheduleAt: z.string().datetime().optional(), // ISO date string
  notifyEmail: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { fileId, targetFormat, options, notifyEmail } = parsed.data

    // Fetch file (must belong to user)
    const file = await prisma.file.findFirst({
      where: { id: fileId, userId: session.user.id },
    })
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Same format check
    if (file.originalFormat.toLowerCase() === targetFormat) {
      return NextResponse.json({ error: 'Output format must differ from input' }, { status: 400 })
    }

    const outputKey = buildS3Key(session.user.id, file.category, `${uuid()}.${targetFormat}`)

    // Create Conversion record
    const conversion = await prisma.conversion.create({
      data: {
        userId: session.user.id,
        fileId,
        targetFormat,
        outputS3Key: outputKey,
        options: options ?? {},
        status: 'PENDING',
      },
    })

    // Queue the BullMQ job
    const jobId = await queueConversion({
      conversionId: conversion.id,
      userId: session.user.id,
      fileId,
      s3Key: file.s3Key,
      originalFormat: file.originalFormat,
      targetFormat,
      outputS3Key: outputKey,
      options,
      notifyEmail: notifyEmail ? session.user.email ?? undefined : undefined,
    })

    return NextResponse.json({
      conversionId: conversion.id,
      jobId,
      status: 'queued',
      message: 'Conversion queued successfully',
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[convert] Error:', err)
    return NextResponse.json({ error: 'Failed to queue conversion' }, { status: 500 })
  }
}

// GET: poll conversion status
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const conversionId = searchParams.get('id')

    if (!conversionId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const conversion = await prisma.conversion.findFirst({
      where: { id: conversionId, userId: session.user.id },
      select: { id: true, status: true, targetFormat: true, outputS3Key: true, errorMessage: true, completedAt: true },
    })

    if (!conversion) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(conversion)
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
