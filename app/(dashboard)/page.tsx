// app/(dashboard)/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  // Fetch real data
  const [totalFiles, totalConversions, recentConversions, scheduledJobs] = await Promise.all([
    prisma.file.count({ where: { userId } }),
    prisma.conversion.count({ where: { userId } }),
    prisma.conversion.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { file: { select: { originalName: true } } },
    }),
    prisma.scheduledJob.count({ where: { userId, isActive: true } }),
  ])

  const successRate = totalConversions > 0
    ? Math.round((await prisma.conversion.count({ where: { userId, status: 'COMPLETE' } }) / totalConversions) * 100)
    : 100

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Good morning 👋</h1>
          <p className="text-text-dim text-sm mt-1">Welcome back, {session.user.name ?? session.user.email}</p>
        </div>
        <Link href="/dashboard/convert"
          className="bg-cyan text-bg font-bold px-5 py-2.5 rounded-xl text-sm hover:opacity-90 transition-all">
          + New conversion
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total files" value={totalFiles} color="text-text" />
        <KpiCard label="Conversions" value={totalConversions} color="text-cyan" />
        <KpiCard label="Scheduled jobs" value={scheduledJobs} color="text-violet" />
        <KpiCard label="Success rate" value={`${successRate}%`} color="text-green-400" />
      </div>

      {/* Recent Conversions */}
      <div className="bg-surface border border-white/7 rounded-2xl p-6">
        <h3 className="font-bold mb-4">Recent Conversions</h3>
        {recentConversions.length === 0 ? (
          <div className="text-center py-10 text-text-dim">
            <div className="text-4xl mb-3">🔁</div>
            <p>No conversions yet. <Link href="/dashboard/convert" className="text-cyan">Convert your first file →</Link></p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentConversions.map(conv => (
              <div key={conv.id} className="flex items-center gap-3 p-3 bg-bg2 rounded-xl border border-white/7">
                <div className="w-9 h-9 rounded-lg bg-cyan/10 flex items-center justify-center text-base">📄</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{conv.file.originalName}</div>
                  <div className="text-xs text-text-dim mt-0.5">→ {conv.targetFormat.toUpperCase()} · {new Date(conv.createdAt).toLocaleDateString()}</div>
                </div>
                <StatusBadge status={conv.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-surface border border-white/7 rounded-xl p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-text-dim mb-2">{label}</div>
      <div className={`font-display text-3xl font-bold ${color}`}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    COMPLETE: 'bg-green-500/10 text-green-400',
    PROCESSING: 'bg-cyan/10 text-cyan',
    PENDING: 'bg-violet/10 text-violet',
    FAILED: 'bg-red-500/10 text-red-400',
    CANCELLED: 'bg-gray-500/10 text-gray-400',
  }
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${styles[status] ?? 'bg-gray-500/10 text-gray-400'}`}>
      {status}
    </span>
  )
}
