import '@/app/globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { initKernel } from '@/lib/kernel/init'

initKernel();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}