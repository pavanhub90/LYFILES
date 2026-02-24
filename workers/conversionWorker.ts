// workers/conversionWorker.ts
import { Worker, Job } from 'bullmq'
import { redis, ConversionJobData, emailQueue } from '../lib/queue'
import { prisma } from '../lib/prisma'
import { runConversion } from '../lib/converter'
import { getDownloadPresignedUrl } from '../lib/s3'

export function startConversionWorker() {
  const worker = new Worker<ConversionJobData>(
    'conversion',
    async (job: Job<ConversionJobData>) => {
      const { conversionId, userId, s3Key, originalFormat, targetFormat, outputS3Key, options, notifyEmail } = job.data

      console.log(`[conversion] Starting job ${job.id} → ${targetFormat}`)

      // 1. Mark as PROCESSING
      await prisma.conversion.update({
        where: { id: conversionId },
        data: { status: 'PROCESSING', startedAt: new Date(), jobId: job.id },
      })

      try {
        // 2. Run the actual conversion
        await job.updateProgress(10)
        const { outputSize } = await runConversion({
          s3Key,
          originalFormat,
          targetFormat,
          outputS3Key,
          options,
        })
        await job.updateProgress(90)

        // 3. Mark as COMPLETE
        await prisma.conversion.update({
          where: { id: conversionId },
          data: {
            status: 'COMPLETE',
            outputS3Key,
            outputSize,
            completedAt: new Date(),
          },
        })

        // 4. Create in-app notification
        await prisma.notification.create({
          data: {
            userId,
            title: 'Conversion complete',
            message: `Your file is ready to download (${targetFormat.toUpperCase()})`,
            type: 'success',
          },
        })

        // 5. Queue email notification (if requested)
        if (notifyEmail) {
          const downloadUrl = await getDownloadPresignedUrl(outputS3Key)
          await emailQueue.add('conversion_complete', {
            to: notifyEmail,
            type: 'conversion_complete',
            payload: {
              fileName: job.data.s3Key.split('/').pop(),
              format: targetFormat,
              downloadUrl,
            },
          })
        }

        await job.updateProgress(100)
        console.log(`[conversion] Job ${job.id} complete`)
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[conversion] Job ${job.id} failed:`, error)

        // Mark FAILED
        await prisma.conversion.update({
          where: { id: conversionId },
          data: { status: 'FAILED', errorMessage: error },
        })

        // Create fail notification
        await prisma.notification.create({
          data: {
            userId,
            title: 'Conversion failed',
            message: error,
            type: 'error',
          },
        })

        // Send failure email
        if (notifyEmail) {
          await emailQueue.add('conversion_failed', {
            to: notifyEmail,
            type: 'conversion_failed',
            payload: {
              fileName: job.data.s3Key.split('/').pop(),
              error,
              retryUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/convert`,
            },
          })
        }

        throw err // Let BullMQ handle retry
      }
    },
    {
      connection: redis,
      concurrency: 4, // Process 4 conversions simultaneously
    }
  )

  worker.on('failed', (job, err) => {
    if (job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
      console.error(`[conversion] Job ${job.id} permanently failed after ${job.attemptsMade} attempts`)
    }
  })

  console.log('[worker] Conversion worker started')
  return worker
}
