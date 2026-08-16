'use client';

import Link from 'next/link';
import { useAuthState } from '@/components/auth/AuthProvider';

type Access = 'public' | 'authenticated' | 'root';

export function SfiExperienceLink({
  href,
  children,
  className,
  access = 'public',
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  access?: Access;
}) {
  const { status, userRole } = useAuthState();
  let target = href;

  if (access !== 'public' && status !== 'authenticated') {
    target = `/login?next=${encodeURIComponent(href)}`;
  } else if (access === 'root' && status === 'authenticated' && userRole !== 'root' && userRole !== 'system') {
    target = '/unauthorized';
  }

  return <Link href={target} className={className}>{children}</Link>;
}
