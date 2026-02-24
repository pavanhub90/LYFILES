// lib/converter.ts
// Core conversion engine — runs inside the worker process (not Next.js serverless)

import { execFile } from 'child_process'
import { promisify } from 'util'
import { createWriteStream, createReadStream } from 'fs'
import { unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join, extname } from 'path'
import { v4 as uuid } from 'uuid'
import sharp from 'sharp'
import { PDFDocument } from 'pdf-lib'
import Ffmpeg from 'fluent-ffmpeg'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { s3, BUCKET } from './s3'
import { Readable } from 'stream'

const execFileAsync = promisify(execFile)

// ── Download file from S3 to temp dir ────────────
async function downloadFromS3(s3Key: string): Promise<string> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }))
  const ext = extname(s3Key) || '.tmp'
  const tmpPath = join(tmpdir(), `ly-in-${uuid()}${ext}`)
  const stream = res.Body as Readable
  await new Promise<void>((resolve, reject) => {
    const ws = createWriteStream(tmpPath)
    stream.pipe(ws)
    ws.on('finish', resolve)
    ws.on('error', reject)
  })
  return tmpPath
}

// ── Upload result to S3 ───────────────────────────
async function uploadToS3(localPath: string, s3Key: string, mimeType: string): Promise<void> {
  const data = createReadStream(localPath)
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: data,
    ContentType: mimeType,
  }))
}

// ── Image conversions (Sharp) ─────────────────────
async function convertImage(
  inputPath: string,
  targetFormat: 'jpeg' | 'png' | 'webp' | 'gif' | 'avif',
  quality = 90
): Promise<Buffer> {
  const pipeline = sharp(inputPath)
  switch (targetFormat) {
    case 'jpeg': return pipeline.jpeg({ quality }).toBuffer()
    case 'png':  return pipeline.png({ quality }).toBuffer()
    case 'webp': return pipeline.webp({ quality }).toBuffer()
    case 'avif': return pipeline.avif({ quality }).toBuffer()
    default:     return pipeline.toBuffer()
  }
}

// ── PDF operations (pdf-lib) ──────────────────────
async function convertImageToPdf(inputPath: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const imgBytes = createReadStream(inputPath)
  const chunks: Buffer[] = []
  for await (const chunk of imgBytes) chunks.push(chunk as Buffer)
  const imgBuf = Buffer.concat(chunks)
  const ext = extname(inputPath).toLowerCase()
  const img = ext === '.png'
    ? await pdfDoc.embedPng(imgBuf)
    : await pdfDoc.embedJpg(imgBuf)
  const page = pdfDoc.addPage([img.width, img.height])
  page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
  return Buffer.from(await pdfDoc.save())
}

// ── Document conversions (LibreOffice headless) ───
async function convertWithLibreOffice(
  inputPath: string,
  targetFormat: string,
  outDir: string
): Promise<string> {
  await execFileAsync('libreoffice', [
    '--headless',
    '--convert-to', targetFormat,
    '--outdir', outDir,
    inputPath,
  ])
  const baseName = inputPath.replace(extname(inputPath), '')
  return `${baseName}.${targetFormat}`
}

// ── Video/Audio conversions (FFmpeg) ─────────────
function convertWithFfmpeg(
  inputPath: string,
  outputPath: string,
  options: { quality?: number; resolution?: string } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    let cmd = Ffmpeg(inputPath)
    if (options.resolution) cmd = cmd.size(options.resolution)
    cmd
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run()
  })
}

// ── Main dispatch function ─────────────────────────
export async function runConversion(params: {
  s3Key: string
  originalFormat: string
  targetFormat: string
  outputS3Key: string
  options?: { quality?: number; resolution?: string }
}): Promise<{ outputSize: number }> {
  const { s3Key, originalFormat, targetFormat, outputS3Key, options } = params
  const tmpIn = await downloadFromS3(s3Key)
  const tmpOut = join(tmpdir(), `ly-out-${uuid()}.${targetFormat}`)

  try {
    const from = originalFormat.toLowerCase()
    const to = targetFormat.toLowerCase()

    // Image → Image
    if (['jpg','jpeg','png','webp','gif','avif'].includes(from) && ['jpg','jpeg','png','webp','avif'].includes(to)) {
      const buf = await convertImage(tmpIn, to as 'jpeg' | 'png' | 'webp' | 'avif', options?.quality)
      await writeFile(tmpOut, buf)
    }
    // Image → PDF
    else if (['jpg','jpeg','png'].includes(from) && to === 'pdf') {
      const buf = await convertImageToPdf(tmpIn)
      await writeFile(tmpOut, buf)
    }
    // Document conversions (DOCX↔PDF, XLSX→CSV, etc.)
    else if (['docx','doc','xlsx','xls','pptx','odt','ods'].includes(from)) {
      await convertWithLibreOffice(tmpIn, to, tmpdir())
    }
    // Video → Video / Video → Audio
    else if (['mp4','mov','avi','mkv','webm'].includes(from)) {
      await convertWithFfmpeg(tmpIn, tmpOut, options)
    }
    // Audio → Audio
    else if (['mp3','wav','flac','aac','ogg'].includes(from)) {
      await convertWithFfmpeg(tmpIn, tmpOut, options)
    }
    else {
      throw new Error(`Unsupported conversion: ${from} → ${to}`)
    }

    const mimeType = getMimeType(to)
    await uploadToS3(tmpOut, outputS3Key, mimeType)
    const { size } = await import('fs').then(fs => fs.promises.stat(tmpOut))
    return { outputSize: size }
  } finally {
    // Cleanup temp files
    await unlink(tmpIn).catch(() => {})
    await unlink(tmpOut).catch(() => {})
  }
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    csv: 'text/csv',
    txt: 'text/plain',
  }
  return map[ext.toLowerCase()] ?? 'application/octet-stream'
}
