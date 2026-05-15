import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Creamos una respuesta mutable
  let response = NextResponse.next()

  // Configuramos el cliente de Supabase con manejo de cookies manual
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  // 1. INYECCIÓN DE CABECERAS DE SEGURIDAD (VHpD Compliance)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // 2. GESTIÓN DE CACHÉ SEGÚN EL SEGMENTO DEL WORLD SPECTRUM
  const { pathname } = request.nextUrl

  if (pathname === '/' || pathname.startsWith('/llms')) {
    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  }

  if (pathname.startsWith('/terminal')) {
    response.headers.set('Cache-Control', 'no-store, must-revalidate')
  }

  // 3. PROTOCOLO DE AUTENTICACIÓN Y VERIFICACIÓN DE NODO
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protección de la Terminal y rutas de configuración
  if (pathname.startsWith('/terminal') || pathname === '/setup-profile') {
    // Redirección por ausencia de sesión activa
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Validación de Integración Longitudinal (Perfil completo)
    const { data: profile } = await supabase
      .from('profiles')
      .select('setup_completed')
      .eq('id', session.user.id)
      .single()

    // Evitar bucle de redirección
    if (profile && !profile.setup_completed && pathname !== '/setup-profile') {
      return NextResponse.redirect(new URL('/setup-profile', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}