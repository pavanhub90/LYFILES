// workers/schedulerWorker.ts
import { Worker, Job } from 'bullmq'
import { redis, SchedulerJobData, conversionQueue } from '../lib/queue'
import { prisma } from '../lib/prisma'
import { buildS3Key } from '../lib/s3'
import { v4 as uuid } from 'uuid'

export function startSchedulerWorker() {
  const worker = new Worker<SchedulerJobData>(
    'scheduler',
    async (job: Job<SchedulerJobData>) => {
      const { scheduledJobId, userId, fileId, targetFormat } = job.data
      console.log(`[scheduler] Running scheduled job ${scheduledJobId}`)

      // Fetch the file record
      const file = await prisma.file.findFirst({ where: { id: fileId, userId } })
      if (!file) throw new Error('File not found for scheduled job')

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })

      // Create a Conversion record
      const outputKey = buildS3Key(userId, file.category, `${uuid()}.${targetFormat}`)
      const conversion = await prisma.conversion.create({
        data: {
          userId,
          fileId,
          targetFormat,
          outputS3Key: outputKey,
          status: 'PENDING',
        },
      })

      // Queue the actual conversion
      await conversionQueue.add('convert', {
        conversionId: conversion.id,
        userId,
        fileId,
        s3Key: file.s3Key,
        originalFormat: file.originalFormat,
        targetFormat,
        outputS3Key: outputKey,
        notifyEmail: user?.email ?? undefined,
      })

      // Update lastRunAt
      await prisma.scheduledJob.update({
        where: { id: scheduledJobId },
        data: { lastRunAt: new Date() },
      })

      console.log(`[scheduler] Queued conversion for scheduled job ${scheduledJobId}`)
    },
    { connection: redis, concurrency: 2 }
  )

  console.log('[worker] Scheduler worker started')
  return worker
}
