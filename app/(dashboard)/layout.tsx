// app/(dashboard)/layout.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/lib/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen pt-16">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-white/7 bg-bg2 fixed top-16 left-0 h-[calc(100vh-64px)] overflow-y-auto p-4">
        <nav className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted px-3 mb-2">Main</p>
          <SidebarLink href="/dashboard" icon="🏠">Overview</SidebarLink>
          <SidebarLink href="/dashboard/convert" icon="🔁">Convert</SidebarLink>
          <SidebarLink href="/dashboard/files" icon="📁">My Files</SidebarLink>
          <SidebarLink href="/dashboard/schedule" icon="📅">Schedule</SidebarLink>

          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted px-3 mb-2 mt-6">Account</p>
          <SidebarLink href="/dashboard/settings" icon="⚙️">Settings</SidebarLink>

          <form action={async () => {
            'use server'
            await signOut({ redirectTo: '/' })
          }}>
            <button type="submit" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-text-dim hover:text-text hover:bg-surface transition-all">
              <span className="w-5 text-center">🚪</span> Sign out
            </button>
          </form>
        </nav>

        {/* Plan badge */}
        <div className="absolute bottom-6 left-4 right-4 bg-surface border border-white/7 rounded-xl p-4">
          <div className="text-xs text-text-dim">Plan</div>
          <div className="font-bold text-cyan mt-1">{session.user.plan ?? 'FREE'}</div>
          {session.user.plan === 'FREE' && (
            <Link href="/pricing" className="text-xs text-violet mt-2 block hover:underline">Upgrade to Pro →</Link>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-60 p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function SidebarLink({ href, icon, children }: { href: string; icon: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-text-dim hover:text-text hover:bg-surface transition-all"
    >
      <span className="w-5 text-center text-base">{icon}</span>
      {children}
    </Link>
  )
}
