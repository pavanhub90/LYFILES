// workers/index.ts
// This runs as a SEPARATE long-running Node.js process (not Next.js serverless)
// Deploy on Railway, Fly.io, or any server that supports persistent processes

import 'dotenv/config'
import { startConversionWorker } from './conversionWorker'
import { startEmailWorker } from './emailWorker'
import { startSchedulerWorker } from './schedulerWorker'

console.log('🚀 Starting LyFiles workers...')

const conversionWorker = startConversionWorker()
const emailWorker = startEmailWorker()
const schedulerWorker = startSchedulerWorker()

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down workers...')
  await Promise.all([
    conversionWorker.close(),
    emailWorker.close(),
    schedulerWorker.close(),
  ])
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  shutdown()
})
