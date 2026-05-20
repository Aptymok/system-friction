import type { Metadata } from 'next'
import { SfiLandingCalibration } from '@/observatory/components/landing/SfiLandingCalibration'

export const metadata: Metadata = {
  title: 'System Friction Institute',
  description: 'Inicializacion de observador longitudinal SFI.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <SfiLandingCalibration />
}
