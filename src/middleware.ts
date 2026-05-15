import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const path = request.nextUrl.pathname

  if (path.startsWith('/api/audit')) {
    if (!token || token !== process.env.AUDIT_SECRET) {
      return new NextResponse(
        JSON.stringify({ success: false, message: 'Unauthorized: Sovereign Access Required' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/audit/:path*', '/api/link/generate'],
}