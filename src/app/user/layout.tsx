import { SubscriptionGate } from '@/components/auth/SubscriptionGate';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <SubscriptionGate>
      {children}
    </SubscriptionGate>
  );
}
