import React from 'react'
import './globals.css' // <--- ESTO ES LO QUE FALTA. IMPORTACIÓN DIRECTA DE LOS ESTILOS GLOBALES

export const metadata = {
  metadataBase: new URL('https://systemfriction.org'),

  title: {
    default: 'System Friction Institute',
    template: '%s | System Friction Institute'
  },

  description:
    'Longitudinal cognitive observatory and epistemic systems architecture.',

  robots: {
    index: true,
    follow: true
  },

  openGraph: {
    title: 'System Friction Institute',
    description:
      'Longitudinal cognitive observatory and epistemic systems architecture.',
    url: 'https://systemfriction.org',
    siteName: 'System Friction Institute',
    locale: 'en_US',
    type: 'website'
  },

  alternates: {
    canonical: 'https://systemfriction.org'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-black text-green-500 antialiased">
        {children}
      </body>
    </html>
  )
}
