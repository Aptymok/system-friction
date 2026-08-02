import type { RootViewId } from './sovereignTypes';

type InternalModule = {
  id: RootViewId;
  label: string;
  key: string;
};

type ExternalModule = {
  id: 'prospect-radar' | 'commercial';
  label: string;
  key: string;
  href: string;
};

const MODULES: Array<InternalModule | ExternalModule> = [
  { id: 'overview', label: 'OVERVIEW', key: '01' },
  { id: 'cognitive-runtime', label: 'COGNITIVE RUNTIME', key: '02' },
  { id: 'governance', label: 'GOVERNANCE', key: '03' },
  { id: 'agents', label: 'AGENTS', key: '04' },
  { id: 'predictions', label: 'PREDICTIONS', key: '05' },
  { id: 'amv', label: 'AMV', key: '06' },
  { id: 'evidence', label: 'EVIDENCE / ATLAS', key: '07' },
  { id: 'execution', label: 'EXECUTION', key: '08' },
  { id: 'prospect-radar', label: 'PROSPECT RADAR', key: '09', href: '/root/prospect-radar' },
  { id: 'commercial', label: 'CLIENT PROPOSALS', key: '10', href: '/root/commercial' },
  { id: 'telemetry', label: 'TELEMETRY', key: '11' },
];

export function RootModuleRail({ active, onChange }: { active: RootViewId; onChange: (view: RootViewId) => void }) {
  return (
    <nav className="rs-rail" aria-label="ROOT modules">
      {MODULES.map((module) => {
        const isActive = module.id === active;
        return (
          <button
            key={module.id}
            type="button"
            className={isActive ? 'active' : ''}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              if ('href' in module) {
                window.location.href = module.href;
                return;
              }
              onChange(module.id);
            }}
          >
            <span>{module.key}</span>
            <strong>{module.label}</strong>
          </button>
        );
      })}
    </nav>
  );
}
