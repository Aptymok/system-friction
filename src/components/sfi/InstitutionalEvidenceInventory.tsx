import type {
  InstitutionalEvidenceInventory as Inventory,
  InstitutionalInventoryItem,
  InventorySource,
} from '@/lib/evidence/institutionalInventoryProjection';
import './InstitutionalEvidenceInventory.css';

type ScopedCase = { id: string; subject: string; status: string; updatedAt: string | null };
type Props = {
  inventory: Inventory;
  cases?: ScopedCase[];
  caseWarnings?: string[];
  context: 'ROOT' | 'METHOD_LAB';
};

const collections: { source: InventorySource; heading: string; count: keyof Inventory['totals']; empty: string }[] = [
  { source: 'root_evidence_entries', heading: 'ROOT · CAPTURED RECORDS', count: 'rootEvidence', empty: 'No ROOT evidence capture records.' },
  { source: 'sfi_evidence_ledger', heading: 'INSTITUTIONAL LEDGER · RECORDED', count: 'ledgerEvidence', empty: 'No ledger records.' },
  { source: 'epistemic_events', heading: 'OPERATIONAL EVENTS · NOT ADMITTED', count: 'operationalEvents', empty: 'No operational events returned.' },
];
function displayCount(value: number | null) { return value === null ? 'UNKNOWN' : value.toLocaleString('en-US'); }
function displayDate(value: string | null) { return value ? value.replace('T', ' ').slice(0, 19) + ' UTC' : 'TIME UNKNOWN'; }

function EventRow({ item }: { item: InstitutionalInventoryItem }) {
  return <li className="sfiEvidenceInventoryRow">
    <div><strong>{item.title}</strong><small>{item.source} · {item.kind} · {item.epistemicClass}</small></div>
    <span>{item.admission.replaceAll('_', ' ')}</span>
    <small>{displayDate(item.recordedAt)} · REF {item.ref || 'MISSING'}</small>
  </li>;
}

export function InstitutionalEvidenceInventory({ inventory, cases, caseWarnings = [], context }: Props) {
  return <section className="sfiEvidenceInventory" aria-label="Institutional evidence and operational trace inventory">
    <header>
      <div>
        <small>OBSERVABILITY / READ ONLY · {context}</small>
        <h2>Evidence inventory and operational traces</h2>
        <p>Existing records are visible without treating event capture, metadata or case objects as verified evidence.</p>
      </div>
      <time dateTime={inventory.generatedAt}>{displayDate(inventory.generatedAt)}</time>
    </header>
    {(inventory.warnings.length > 0 || caseWarnings.length > 0) &&
      <div className="sfiEvidenceInventoryWarning" role="status">PARTIAL READ · {[...inventory.warnings, ...caseWarnings].join(' · ')}</div>}
    <div className="sfiEvidenceInventoryColumns">
      {collections.map(({ source, heading, count, empty }) => {
        const items = inventory.items.filter(item => item.source === source);
        return <details key={source} className="sfiEvidenceInventoryGroup" open={source !== 'epistemic_events'}>
          <summary><span>{heading}</span><strong>{displayCount(inventory.totals[count])}</strong></summary>
          <p>{source === 'epistemic_events'
            ? 'An execution or RETURN event records activity, not independent verification of its claims.'
            : source === 'root_evidence_entries'
              ? 'Captured record existence is not verification of the submitted claims.'
              : 'Ledger entry existence is not proof that an underlying assertion was validated.'}</p>
          {items.length === 0 ? <p className="sfiEvidenceInventoryEmpty">{empty}</p>
            : <ol className="sfiEvidenceInventoryList">{items.map(item => <EventRow key={item.source + ':' + item.ref} item={item} />)}</ol>}
        </details>;
      })}
    </div>
    {cases && <details className="sfiEvidenceInventoryGroup sfiEvidenceInventoryCases">
      <summary><span>CASE PLATFORM · ACCESSIBLE CASE INDEX, NOT ROOT EVIDENCE</span><strong>{cases.length}</strong></summary>
      <p>Case records are tenant-scoped. Their private objects are not copied to institutional evidence or Method Lab.</p>
      <ol className="sfiEvidenceInventoryList">{cases.slice(0, 20).map(item => <li className="sfiEvidenceInventoryRow" key={item.id}>
        <div><strong>{item.subject}</strong><small>{item.status} · {item.id}</small></div>
        <small>{displayDate(item.updatedAt)}</small>
      </li>)}</ol>
    </details>}
    <footer>
      <p>{inventory.boundary}</p>
      <small>Showing at most {inventory.sampleLimitPerSource} recent rows per institutional source; counts cover each source when readable. {context === 'METHOD_LAB'
        ? 'Operational events shown here are CONTEXT ONLY and cannot be selected as evidence for runs. The existing evidence selector retains its governed admission rules.'
        : 'The proposal queue below is separate from this inventory.'}</small>
    </footer>
  </section>;
}
