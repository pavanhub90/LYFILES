// workers/emailWorker.ts
import { Worker, Job } from 'bullmq'
import { redis, EmailJobData } from '../lib/queue'
import {
  sendConversionCompleteEmail,
  sendConversionFailedEmail,
  sendScheduledJobEmail,
  sendWeeklyDigestEmail,
} from '../lib/email'

export function startEmailWorker() {
  const worker = new Worker<EmailJobData>(
    'email',
    async (job: Job<EmailJobData>) => {
      const { to, type, payload } = job.data
      console.log(`[email] Sending ${type} to ${to}`)

      switch (type) {
        case 'conversion_complete':
          await sendConversionCompleteEmail(to, payload as Parameters<typeof sendConversionCompleteEmail>[1])
          break
        case 'conversion_failed':
          await sendConversionFailedEmail(to, payload as Parameters<typeof sendConversionFailedEmail>[1])
          break
        case 'scheduled_job':
          await sendScheduledJobEmail(to, payload as Parameters<typeof sendScheduledJobEmail>[1])
          break
        case 'weekly_digest':
          await sendWeeklyDigestEmail(to, payload as Parameters<typeof sendWeeklyDigestEmail>[1])
          break
        default:
          console.warn(`[email] Unknown email type: ${type}`)
      }

      console.log(`[email] Sent ${type} to ${to}`)
    },
    {
      connection: redis,
      concurrency: 10,
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[email] Failed to send email for job ${job?.id}:`, err.message)
  })

  console.log('[worker] Email worker started')
  return worker
}
