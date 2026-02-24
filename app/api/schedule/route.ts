// app/api/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { queueScheduledJob, removeScheduledJob } from '@/lib/queue'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  fileId: z.string().cuid(),
  targetFormat: z.string().min(1),
  scheduleAt: z.string().datetime().optional(),
  cronExpression: z.string().optional(),
  repeat: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  emailOnDone: z.boolean().default(true),
})

// Predefined cron patterns
const repeatToCron: Record<string, string> = {
  DAILY:   '0 9 * * *',     // 9AM every day
  WEEKLY:  '0 9 * * 1',     // 9AM every Monday
  MONTHLY: '0 9 1 * *',     // 9AM first of month
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth()
    const jobs = await prisma.scheduledJob.findMany({
      where: { userId: session.user.id, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true } } },
    })
    return NextResponse.json({ jobs })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { name, fileId, targetFormat, repeat, emailOnDone, cronExpression } = parsed.data
    const bullJobId = `schedule-${uuid()}`
    const cron = cronExpression ?? (repeat ? repeatToCron[repeat] : undefined)

    const job = await prisma.scheduledJob.create({
      data: {
        userId: session.user.id,
        name,
        fileId,
        targetFormat,
        repeat,
        cronExpression: cron,
        bullJobId,
        emailOnDone,
      },
    })

    // Register in BullMQ if recurring
    if (cron) {
      await queueScheduledJob(
        { scheduledJobId: job.id, userId: session.user.id, fileId: fileId!, targetFormat },
        cron,
        bullJobId
      )
    }

    return NextResponse.json({ job }, { status: 201 })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('id')
    if (!jobId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const job = await prisma.scheduledJob.findFirst({
      where: { id: jobId, userId: session.user.id },
    })
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Remove from BullMQ
    if (job.bullJobId) await removeScheduledJob(job.bullJobId).catch(() => {})

    await prisma.scheduledJob.update({ where: { id: jobId }, data: { isActive: false } })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
