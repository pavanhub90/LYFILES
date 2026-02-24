# 🚀 LyFiles — Setup Guide (Starting From Zero)

Follow these steps in order. Estimated time: **45–60 minutes**.

---

## Step 1 — Install Required Tools

### Install Node.js (v20+)
Download from [nodejs.org](https://nodejs.org) → choose "LTS" version.

Verify install:
```bash
node --version   # should show v20+
npm --version    # should show 10+
```

### Install PostgreSQL
Download from [postgresql.org/download](https://www.postgresql.org/download/).

Or use a free cloud DB (easier):
- **Neon** (recommended): [neon.tech](https://neon.tech) → free tier → copy connection string

### Install Redis
Local:
- **Windows**: [github.com/microsoftarchive/redis](https://github.com/microsoftarchive/redis/releases)
- **Mac**: `brew install redis && brew services start redis`
- **Linux**: `sudo apt install redis-server && sudo service redis start`

Or free cloud Redis:
- **Upstash**: [upstash.com](https://upstash.com) → free tier → copy Redis URL

### Install FFmpeg (for video/audio conversion)
- **Windows**: [ffmpeg.org/download](https://ffmpeg.org/download.html) → add to PATH
- **Mac**: `brew install ffmpeg`
- **Linux**: `sudo apt install ffmpeg`

### Install LibreOffice (for document conversion)
- **Windows/Mac**: [libreoffice.org/download](https://www.libreoffice.org/download/download/)
- **Linux**: `sudo apt install libreoffice`

---

## Step 2 — Clone & Install

```bash
# Extract the lyfiles project folder, then:
cd lyfiles
npm install
```

---

## Step 3 — Set Up Environment Variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Your PostgreSQL / Neon connection string |
| `REDIS_URL` | Your Redis / Upstash URL |
| `AUTH_SECRET` | Run: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID/SECRET` | [console.cloud.google.com](https://console.cloud.google.com) → APIs → OAuth |
| `GITHUB_CLIENT_ID/SECRET` | [github.com/settings/developers](https://github.com/settings/developers) |
| `S3_*` | AWS S3 bucket or Cloudflare R2 |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → free tier (3,000 emails/month) |

### Quick S3 setup (AWS):
1. Go to [s3.console.aws.amazon.com](https://s3.console.aws.amazon.com)
2. Create bucket: `lyfiles-storage`
3. Block all public access: **YES**
4. Go to IAM → Create user → Attach `AmazonS3FullAccess` policy
5. Create access key → copy to `.env.local`

### Quick S3 setup (Cloudflare R2 — cheaper):
1. [dash.cloudflare.com](https://dash.cloudflare.com) → R2 → Create bucket
2. Create API token with R2 read/write permissions
3. Set `S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`

---

## Step 4 — Set Up the Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate dev --name init

# Optional: view data in browser UI
npx prisma studio
```

---

## Step 5 — Run Locally

Open **two terminals**:

**Terminal 1 — Next.js web server:**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

**Terminal 2 — Background workers:**
```bash
npm run workers
```

Workers handle:
- File conversion jobs (FFmpeg, LibreOffice, Sharp)
- Email notifications (Resend)
- Scheduled/recurring jobs (BullMQ)

---

## Step 6 — Test Everything

### Test registration:
1. Go to `http://localhost:3000/register`
2. Create an account with email + password
3. Should redirect to `/dashboard`

### Test file conversion:
1. Go to `/dashboard/convert`
2. Upload a `.docx` file
3. Select `pdf` as output
4. Click "Start conversion"
5. Check Terminal 2 — you should see worker logs
6. Go to `/dashboard/files` — converted file should appear

### Test email:
1. In Settings, enable "Email on conversion complete"
2. Run a conversion
3. Check your inbox (and spam folder)

### Test scheduling:
1. Go to `/dashboard/schedule`
2. Create a weekly schedule
3. Check Terminal 2 for `[scheduler]` logs

---

## Step 7 — Deploy to Production

### Frontend → Vercel (free)

```bash
npm install -g vercel
vercel
```

- Follow prompts
- Add all `.env.local` variables in Vercel dashboard → Project → Settings → Environment Variables
- Set `NEXTAUTH_URL=https://your-domain.com`

### Workers → Railway (recommended, $5/month)

1. Go to [railway.app](https://railway.app)
2. New project → Deploy from GitHub
3. Add all env variables
4. Set start command: `npm run workers`
5. Add Redis service (or use Upstash URL)

### Database → Neon (free tier)

1. [neon.tech](https://neon.tech) → Create project
2. Copy connection string to `DATABASE_URL`
3. Run `npx prisma migrate deploy` (production migration)

### Complete production checklist:
- [ ] `AUTH_SECRET` is a secure random value
- [ ] `NEXTAUTH_URL` matches your real domain
- [ ] S3 bucket CORS is configured for your domain
- [ ] Workers are running on Railway/Fly.io (NOT Vercel)
- [ ] Resend domain is verified for production emails
- [ ] PostgreSQL SSL is enabled in `DATABASE_URL`

---

## Project Structure (quick reference)

```
lyfiles/
├── app/
│   ├── (auth)/login/        ← Login page
│   ├── (auth)/register/     ← Register page
│   ├── (dashboard)/         ← Protected dashboard
│   ├── api/
│   │   ├── auth/            ← NextAuth + registration
│   │   ├── upload/          ← Pre-signed S3 URL
│   │   ├── convert/         ← Queue conversion job
│   │   ├── files/           ← List/delete files
│   │   ├── download/        ← Signed download URL
│   │   └── schedule/        ← CRUD scheduled jobs
│   └── layout.tsx
├── lib/
│   ├── auth.ts              ← NextAuth v5 config
│   ├── prisma.ts            ← DB client
│   ├── s3.ts                ← S3/R2 client
│   ├── queue.ts             ← BullMQ queues
│   ├── email.ts             ← Resend templates
│   └── converter.ts         ← Conversion engine
├── workers/
│   ├── conversionWorker.ts  ← Processes conversions
│   ├── emailWorker.ts       ← Sends emails
│   ├── schedulerWorker.ts   ← Runs scheduled jobs
│   └── index.ts             ← Worker entry point
├── prisma/schema.prisma     ← Database schema
├── middleware.ts             ← Route protection
└── .env.example             ← All env vars listed
```

---

## Need help?

- 📧 support@lyfiles.com
- 💬 [Discord](https://discord.gg/lyfiles)
- 🐛 [GitHub Issues](https://github.com/yourusername/lyfiles/issues)
