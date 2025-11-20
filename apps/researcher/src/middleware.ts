// import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Clerk 認証を一時的に無効化
export default function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard(.*)',
    '/participants(.*)'
  ],
}


