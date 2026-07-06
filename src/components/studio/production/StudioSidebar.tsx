'use client';

export type StudioProductionScreen =
  | 'overview'
  | 'sessions'
  | 'live-desk'
  | 'composition'
  | 'sound-design'
  | 'arrangements'
  | 'mix-console'
  | 'mastering'
  | 'neural-audio-graph'
  | 'memory-archives';

export const studioProductionScreens: Array<{ id: StudioProductionScreen; label: string; code: string }> = [
  { id: 'overview', label: 'Overview', code: '01' },
  { id: 'sessions', label: 'Sessions', code: '02' },
  { id: 'live-desk', label: 'Live Desk', code: '03' },
  { id: 'composition', label: 'Composition', code: '04' },
  { id: 'sound-design', label: 'Sound Design', code: '05' },
  { id: 'arrangements', label: 'Arrangements', code: '06' },
  { id: 'mix-console', label: 'Mix Console', code: '07' },
  { id: 'mastering', label: 'Mastering', code: '08' },
  { id: 'neural-audio-graph', label: 'Neural Audio Graph', code: '09' },
  { id: 'memory-archives', label: 'Memory / Archives', code: '10' },
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
      <nav aria-label="Studio production screens">
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
        <p>Core Studio surface only. No collaborator module mounted.</p>
      </div>
    </aside>
  );
}
