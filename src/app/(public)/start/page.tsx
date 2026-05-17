import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inicializar observador',
  description: 'Entrada institucional SFI.',
}

export default function StartPage() {
  redirect('/login')
}
