// src/app/(user)/layout.tsx
import { AuthProvider } from '@/components/providers/AuthProvider';
import { SubscriptionGate } from '@/components/auth/SubscriptionGate';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SubscriptionGate>
        {children}
      </SubscriptionGate>
    </AuthProvider>
  );
}
