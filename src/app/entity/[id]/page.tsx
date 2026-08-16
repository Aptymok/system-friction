import type { Metadata } from 'next';
import { EntityCinematicFailure, EntityCinematicWorkspace } from '@/components/entity/EntityCinematicWorkspace';
import { readEntityContextView } from '@/lib/entity/readEntityContextView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

type EntityPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ entityType?: string }>;
};

export default async function EntityPage({ params, searchParams }: EntityPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const readResult = await readEntityContextView({ entityId: id, entityType: query.entityType });
  if (!readResult.ok || !readResult.result.context) return <EntityCinematicFailure id={id} result={readResult} />;
  return <EntityCinematicWorkspace result={readResult.result} />;
}
