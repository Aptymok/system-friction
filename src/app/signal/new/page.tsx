import { Suspense } from 'react';
import { HumanSignalIngress } from '@/components/sfi/HumanSignalIngress';

export const dynamic = 'force-dynamic';

export default function NewSignalPage() {
  return <Suspense fallback={null}><HumanSignalIngress /></Suspense>;
}
