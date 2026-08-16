import { SfiCaseCinematicWorkspace } from '@/components/cases/SfiCaseCinematicWorkspace';
import { buildCaseCinematicReadModel } from '@/lib/sfi/case-platform/cinematicReadModel';
import { requireAuthenticatedUser } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

export default async function SfiCaseWorkspacePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { user } = await requireAuthenticatedUser();
  const { caseId } = await params;
  const model = await buildCaseCinematicReadModel(caseId, user.id);
  return <SfiCaseCinematicWorkspace model={model} />;
}
