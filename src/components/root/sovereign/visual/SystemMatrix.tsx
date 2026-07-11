import type { RootSystemItem } from '@/lib/root/sovereign/rootSovereignState';
import type { RootSelection } from '../sovereignTypes';

function value(value: string | number | null, missing: string) { return value === null ? missing : String(value); }

export function SystemMatrix({ items, onSelect }: { items: RootSystemItem[]; onSelect: (selection: RootSelection) => void }) {
  return <div className="rs-table-wrap"><table className="rs-table"><thead><tr><th>SYSTEM</th><th>STATE</th><th>SOURCE</th><th>LAST OBSERVED</th><th>CONFIDENCE</th><th>OPEN ITEMS</th><th>WARNING</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} tabIndex={0} onClick={() => onSelect({ kind: 'system', id: item.id, title: item.label, source: item.state.source, observedAt: item.state.observedAt, confidence: item.state.confidence, evidenceIds: item.state.evidenceIds, warning: item.state.warning, data: item })} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') event.currentTarget.click(); }}><th>{item.label}</th><td><span className={`rs-status status-${item.state.status}`}>{value(item.state.value, 'SIN DATO')}</span></td><td>{item.state.source}</td><td>{item.state.observedAt ?? 'NO MEDIDO'}</td><td>{item.state.confidence === null ? 'NO MEDIDO' : item.state.confidence.toFixed(3)}</td><td>{value(item.openItems.value, 'NO MEDIDO')}</td><td>{item.state.warning ?? '—'}</td></tr>)}</tbody></table></div>;
}
