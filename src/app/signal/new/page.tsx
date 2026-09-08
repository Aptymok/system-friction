import { Suspense } from 'react';
import { NewSignalIngress } from '@/components/sfi/NewSignalIngress';

export const dynamic = 'force-dynamic';

export default function NewSignalPage() {
  return <Suspense fallback={null}><NewSignalIngress /></Suspense>;
}
