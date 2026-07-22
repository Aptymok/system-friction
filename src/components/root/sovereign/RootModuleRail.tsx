import type { RootViewId } from './sovereignTypes';

const MODULES: Array<{ id: RootViewId; label: string; key: string }> = [
  { id: 'overview', label: 'OVERVIEW', key: '01' },
  { id: 'cognitive-runtime', label: 'COGNITIVE RUNTIME', key: '02' },
  { id: 'governance', label: 'GOVERNANCE', key: '03' },
  { id: 'agents', label: 'AGENTS', key: '04' },
  { id: 'predictions', label: 'PREDICTIONS', key: '05' },
  { id: 'amv', label: 'AMV', key: '06' },
  { id: 'evidence', label: 'EVIDENCE / ATLAS', key: '07' },
  { id: 'execution', label: 'EXECUTION', key: '08' },
  { id: 'telemetry', label: 'TELEMETRY', key: '09' },
];

export function RootModuleRail({ active, onChange }: { active: RootViewId; onChange: (view: RootViewId) => void }) {
  return <nav className="rs-rail" aria-label="ROOT modules">{MODULES.map((module) => <button key={module.id} type="button" className={active === module.id ? 'active' : ''} aria-current={active === module.id ? 'page' : undefined} onClick={() => onChange(module.id)}><span>{module.key}</span><strong>{module.label}</strong></button>)}</nav>;
}
