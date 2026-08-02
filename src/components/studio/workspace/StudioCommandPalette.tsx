import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';

export function StudioCommandPalette({ state }: { state: StudioProductionState }) {
  const commands = [
    ['analyze_audio', state.activeObject.id ? 'AVAILABLE' : 'BLOCKED_BY_INPUT'],
    ['open_capabilities', 'AVAILABLE'],
    ['inspect_trace', state.evidence.length ? 'AVAILABLE' : 'BLOCKED_BY_INPUT'],
    ['request_intention', 'REQUIRES_DECLARATION'],
    ['ingest_field_return', 'REQUIRES_FIELD_EVIDENCE'],
  ];
  return (
    <section className="studio-command-palette" aria-label="Command palette preview">
      {commands.map(([command, status]) => <span key={command}><strong>{command}</strong><em>{status}</em></span>)}
    </section>
  );
}
