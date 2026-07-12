import type { RootRow } from '@/lib/root/sovereign/rootSovereignState';
import type { RootSelection } from '../sovereignTypes';

export function AmvLattice({ memories, onSelect }: { memories: RootRow[]; onSelect: (selection: RootSelection) => void }) {
  if (!memories.length) return <div className="rs-empty"><b>SIN MEMORIA</b><p>No hay filas persistidas en sfi_amv_memory.</p></div>;
  return <div className="rs-lattice">{memories.slice(0, 30).map((memory, index) => <button type="button" key={String(memory.id ?? index)} onClick={() => onSelect({ kind: 'AMV memory', id: String(memory.id ?? index), title: String(memory.input_summary ?? memory.output_summary ?? 'AMV memory'), source: 'sfi_amv_memory', observedAt: typeof memory.created_at === 'string' ? memory.created_at : null, confidence: typeof memory.source_trust === 'number' ? memory.source_trust : null, evidenceIds: typeof memory.input_hash === 'string' ? [memory.input_hash] : [], warning: memory.requires_human_validation ? 'REQUIERE VALIDACIÓN HUMANA' : null, data: memory })}><span>{String(memory.module ?? 'AMV')}</span><strong>{String(memory.input_summary ?? memory.output_summary ?? 'SIN RESUMEN').slice(0, 64)}</strong><em>{String(memory.created_at ?? 'NO MEDIDO').slice(0, 16)}</em></button>)}</div>;
}
