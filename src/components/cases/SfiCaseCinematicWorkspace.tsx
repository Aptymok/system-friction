'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SfiCinematicSurface,
  type SfiCinematicCrumb,
  type SfiCinematicInsight,
  type SfiCinematicNode,
  type SfiCinematicRelation,
  type SfiCinematicStat,
  type SfiCinematicTimelineItem,
} from '@/components/sfi/cinematic/SfiCinematicSurface';
import './case-cinematic.css';

export type SfiCaseCinematicModel = {
  caseId: string;
  subject: string;
  scope: string;
  serviceProfileId: string;
  serviceLabel: string;
  status: string;
  tenantId: string;
  timeWindow: string;
  generatedAt: string;
  crumbs: SfiCinematicCrumb[];
  nodes: SfiCinematicNode[];
  relations: SfiCinematicRelation[];
  insights: SfiCinematicInsight[];
  timeline: SfiCinematicTimelineItem[];
  evidenceStats: SfiCinematicStat[];
  mihmStats: SfiCinematicStat[];
  frictionStats: SfiCinematicStat[];
  regimeStats: SfiCinematicStat[];
  returnStats: SfiCinematicStat[];
  actions: Array<{ id: string; label: string; disabled?: boolean }>;
  commands: string[];
  fieldLabel: string;
  fieldDetail: string;
  authorityNote: string;
};

export function SfiCaseCinematicWorkspace({ model }: { model: SfiCaseCinematicModel }) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  function onAction(action: string) {
    if (action === 'observe' || action === 'trace' || action === 'contrast') {
      setNotice(`${action.toUpperCase()} actualiza el foco de lectura; no altera evidencia ni ejecuta acciones externas.`);
      return;
    }
    if (action === 'lab') {
      window.location.assign('/method-lab');
      return;
    }
    if (action === 'report') {
      setNotice('REPORT usa el expediente persistido del caso. La generación no concede autoridad de ejecución.');
      return;
    }
    if (action === 'approve') {
      setNotice('Las decisiones se realizan contra propuestas persistidas y autoridad de tenant; esta vista no infiere aprobación por intención.');
      return;
    }
    setNotice(`${action.toUpperCase()} requiere el adaptador autorizado del caso.`);
  }

  function onCommand(command: string) {
    setNotice(`Consulta fijada al caso ${model.caseId}: ${command}`);
  }

  return (
    <SfiCinematicSurface
      brand="SFI CASE"
      subtitle={model.serviceLabel.toUpperCase()}
      crumbs={model.crumbs}
      timeWindow={model.timeWindow}
      integrity={model.status}
      artifactId={model.caseId}
      certificateState="CASE RECORD"
      mode={model.serviceProfileId}
      generatedAt={model.generatedAt}
      nodes={model.nodes}
      relations={model.relations}
      fieldLabel={model.fieldLabel}
      fieldDetail={model.fieldDetail}
      insights={model.insights}
      timeline={model.timeline}
      evidenceStats={model.evidenceStats}
      mihmStats={model.mihmStats}
      frictionStats={model.frictionStats}
      regimeStats={model.regimeStats}
      returnStats={model.returnStats}
      actions={model.actions}
      commands={model.commands}
      onAction={onAction}
      onCommand={onCommand}
      toolbar={<>
        <button type="button" onClick={() => router.refresh()}>REFRESH</button>
        <a href="/studio" className="sfi-cine-link">STUDIO</a>
      </>}
      fieldOverlay={notice ? <div className="sfi-case-notice"><span>ACTIVE CONTEXT</span><p>{notice}</p><button type="button" onClick={() => setNotice(null)}>CLOSE</button></div> : null}
      footer={<><span>{model.authorityNote}</span><span>COMMERCIAL RESULT ≠ INSTITUTIONAL TRUTH</span></>}
    />
  );
}
