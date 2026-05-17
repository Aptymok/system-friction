import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'System Friction Institute',
  description: 'Inicializacion de observador longitudinal SFI.',
  robots: { index: false, follow: false },
}

export default function Page() {
  redirect('/login')
}
