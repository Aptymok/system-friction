import '@/app/globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#080806' };
export const metadata: Metadata = { title: { default: 'System Friction Institute', template: '%s | SFI' }, description: 'Live observatory for evidence, systems, governance and agentic action.' };
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="es"><body><AuthProvider>{children}</AuthProvider></body></html>; }
