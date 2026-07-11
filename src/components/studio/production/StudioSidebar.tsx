'use client';

export type StudioProductionScreen =
  | 'object'
  | 'observation'
  | 'systemic'
  | 'projection'
  | 'decision'
  | 'return';

export const studioProductionScreens: Array<{ id: StudioProductionScreen; label: string; code: string; description: string }> = [
  { id: 'object', label: 'OBJETO', code: '01', description: 'Carga, identidad y estado' },
  { id: 'observation', label: 'OBSERVACIÓN', code: '02', description: 'Features y evidencia' },
  { id: 'systemic', label: 'LECTURA SISTÉMICA', code: '03', description: 'Mundo, vectores y MIHM' },
  { id: 'projection', label: 'PROYECCIÓN', code: '04', description: 'Compatibilidad y ventana' },
  { id: 'decision', label: 'DECISIÓN', code: '05', description: 'Rutas y microajustes' },
  { id: 'return', label: 'RETORNO', code: '06', description: 'Outcome, error y aprendizaje' },
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
        <div><strong>SFI</strong><em>STUDIO</em></div>
      </div>
      <p className="sfi-production__side-kicker">OBJECT INTELLIGENCE LAB</p>
      <nav aria-label="Ciclo operativo de Studio">
        {studioProductionScreens.map((screen) => (
          <button key={screen.id} type="button" className={screen.id === active ? 'is-active' : ''} onClick={() => onSelect(screen.id)}>
            <span>{screen.code}</span>
            <div><b>{screen.label}</b><small>{screen.description}</small></div>
          </button>
        ))}
      </nav>
      <div className="sfi-production__side-status">
        <span>SESSION</span>
        <strong>{sessionStatus.toUpperCase()}</strong>
        <p>Observar → proyectar → intervenir → verificar → aprender.</p>
      </div>
    </aside>
  );
}
