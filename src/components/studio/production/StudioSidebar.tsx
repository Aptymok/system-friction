'use client';

export type StudioProductionScreen =
  | 'overview'
  | 'measure'
  | 'structure'
  | 'field'
  | 'intervention'
  | 'memory';

export const studioProductionScreens: Array<{ id: StudioProductionScreen; label: string; code: string }> = [
  { id: 'overview', label: 'OVERVIEW', code: '01' },
  { id: 'measure', label: 'MEASURE', code: '02' },
  { id: 'structure', label: 'STRUCTURE', code: '03' },
  { id: 'field', label: 'FIELD', code: '04' },
  { id: 'intervention', label: 'INTERVENTION', code: '05' },
  { id: 'memory', label: 'MEMORY', code: '06' },
];

export function StudioSidebar({
  active,
  onSelect,
  sessionStatus,
}: {
  active: StudioProductionScreen;
  onSelect: (screen: StudioProductionScreen) => void;
  sessionStatus: string;
}) {
  return (
    <aside className="sfi-production__sidebar">
      <div className="sfi-production__brand">
        <span className="sfi-production__mark" />
        <div>
          <strong>SFI</strong>
          <em>STUDIO</em>
        </div>
      </div>
      <nav aria-label="Studio modules">
        {studioProductionScreens.map((screen) => (
          <button
            key={screen.id}
            type="button"
            className={screen.id === active ? 'is-active' : ''}
            onClick={() => onSelect(screen.id)}
          >
            <span>{screen.code}</span>
            <b>{screen.label}</b>
          </button>
        ))}
      </nav>
      <div className="sfi-production__side-status">
        <span>SESSION STATUS</span>
        <strong>{sessionStatus.toUpperCase()}</strong>
        <p>Canonical Studio object laboratory.</p>
      </div>
    </aside>
  );
}
