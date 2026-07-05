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
  | 'memory-archives'
  | 'deliverables'
  | 'settings';

export const studioProductionScreens: Array<{ id: StudioProductionScreen; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'live-desk', label: 'Live Desk' },
  { id: 'composition', label: 'Composition' },
  { id: 'sound-design', label: 'Sound Design' },
  { id: 'arrangements', label: 'Arrangements' },
  { id: 'mix-console', label: 'Mix Console' },
  { id: 'mastering', label: 'Mastering' },
  { id: 'neural-audio-graph', label: 'Neural Audio Graph' },
  { id: 'memory-archives', label: 'Memory / Archives' },
  { id: 'deliverables', label: 'Deliverables' },
  { id: 'settings', label: 'Settings' },
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
            {screen.label}
          </button>
        ))}
      </nav>
      <div className="sfi-production__side-status">
        <span>SESSION STATUS</span>
        <strong>{sessionStatus.toUpperCase()}</strong>
        <p>No collaborator module mounted.</p>
      </div>
    </aside>
  );
}
