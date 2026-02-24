// lib/queue.ts
import { Queue, QueueOptions } from 'bullmq'
import IORedis from 'ioredis'

// ── Redis connection (shared across queues)
export const redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
})

const defaultOpts: QueueOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
}

// ── Queues
export const conversionQueue = new Queue('conversion', defaultOpts)
export const emailQueue = new Queue('email', defaultOpts)
export const schedulerQueue = new Queue('scheduler', defaultOpts)

// ── Job type definitions
export interface ConversionJobData {
  conversionId: string
  userId: string
  fileId: string
  s3Key: string
  originalFormat: string
  targetFormat: string
  outputS3Key: string
  options?: { quality?: number; resolution?: string }
  notifyEmail?: string
}

export interface EmailJobData {
  to: string
  type: 'conversion_complete' | 'conversion_failed' | 'scheduled_job' | 'weekly_digest'
  payload: Record<string, unknown>
}

export interface SchedulerJobData {
  scheduledJobId: string
  userId: string
  fileId: string
  targetFormat: string
  options?: Record<string, unknown>
}

// ── Helper: add conversion job
export async function queueConversion(data: ConversionJobData) {
  const job = await conversionQueue.add('convert', data, {
    priority: data.options?.quality ?? 50,
  })
  return job.id
}

// ── Helper: add scheduled (repeating) job
export async function queueScheduledJob(
  data: SchedulerJobData,
  cronExpression: string,
  jobId: string
) {
  return schedulerQueue.add('scheduled-convert', data, {
    repeat: { pattern: cronExpression },
    jobId,
  })
}

// ── Helper: remove a repeating job
export async function removeScheduledJob(jobId: string) {
  await schedulerQueue.removeRepeatable('scheduled-convert', { jobId } as Parameters<typeof schedulerQueue.removeRepeatable>[1])
}
