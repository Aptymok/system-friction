// Archivo: src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // 1. Proteger la Consola
  if (req.nextUrl.pathname.startsWith('/terminal')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // 2. Verificar si el perfil está completo (Post-compra)
    const { data: profile } = await supabase
      .from('profiles')
      .select('setup_completed')
      .eq('id', session.user.id)
      .single()

    if (profile && !profile.setup_completed) {
      return NextResponse.redirect(new URL('/setup-profile', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/terminal/:path*', '/setup-profile'],
}