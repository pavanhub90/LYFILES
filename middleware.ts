// middleware.ts
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname

  // Protected routes
  const protectedPaths = ['/dashboard', '/convert', '/files', '/schedule', '/settings']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Already logged in → redirect away from auth pages
  const authPaths = ['/login', '/register']
  if (authPaths.includes(pathname) && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/convert/:path*',
    '/files/:path*',
    '/schedule/:path*',
    '/settings/:path*',
    '/login',
    '/register',
    '/api/upload',
    '/api/convert',
    '/api/files/:path*',
    '/api/schedule/:path*',
    '/api/download/:path*',
  ],
}
