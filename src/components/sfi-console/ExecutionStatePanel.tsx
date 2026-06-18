'use client';

import { useEffect, useMemo, useState } from 'react';

type ExecutionRecord = Record<string, unknown>;

type ExecutionStateResponse = {
  ok?: boolean;
  error?: string;
  perturbations?: ExecutionRecord[];
  capabilityChecks?: ExecutionRecord[];
  ledgerEntries?: ExecutionRecord[];
  mediaAssets?: ExecutionRecord[];
  outcomes?: ExecutionRecord[];
  lessons?: ExecutionRecord[];
};

type ExecutionStatePanelProps = {
  caseId: string;
};

type ExecutionBucket = {
  key: keyof Pick<
    ExecutionStateResponse,
    'perturbations' | 'capabilityChecks' | 'ledgerEntries' | 'mediaAssets' | 'outcomes' | 'lessons'
  >;
  label: string;
};

const buckets: ExecutionBucket[] = [
  { key: 'perturbations', label: 'Perturbaciones' },
  { key: 'capabilityChecks', label: 'Capacidades' },
  { key: 'ledgerEntries', label: 'Ledger' },
  { key: 'mediaAssets', label: 'Media' },
  { key: 'outcomes', label: 'Outcomes' },
  { key: 'lessons', label: 'Lessons' },
];

function scalar(input: unknown) {
  if (input === null || input === undefined || input === '') return '-';
  if (typeof input === 'number') return Number.isInteger(input) ? String(input) : input.toFixed(3);
  if (typeof input === 'boolean') return input ? 'si' : 'no';
  if (typeof input === 'string') return input;
  return JSON.stringify(input);
}

function recordTitle(record: ExecutionRecord, index: number) {
  return scalar(
    record.title ??
      record.name ??
      record.status ??
      record.action ??
      record.event_type ??
      record.media_type ??
      record.lesson ??
      record.id ??
      `registro ${index + 1}`
  );
}

function RecordRow({ record, index }: { record: ExecutionRecord; index: number }) {
  const entries = Object.entries(record).filter(([, data]) => data !== null && data !== undefined && data !== '');
  const preview = entries.slice(0, 6);

  return (
    <li className="border border-white/10 bg-black/35 p-3">
      <div className="flex items-start justify-between gap-3">
        <span className="break-words text-sm text-white/85">{recordTitle(record, index)}</span>
        <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-white/35">#{index + 1}</span>
      </div>
      {preview.length > 0 && (
        <dl className="mt-3 grid gap-2 text-xs md:grid-cols-2">
          {preview.map(([key, data]) => (
            <div key={key} className="min-w-0 border-t border-white/10 pt-2">
              <dt className="truncate uppercase tracking-[0.14em] text-white/35">{key}</dt>
              <dd className="mt-1 break-words text-white/65">{scalar(data)}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

function BucketBlock({ label, records }: { label: string; records: ExecutionRecord[] }) {
  return (
    <section className="border border-white/10 p-3">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/10 pb-2">
        <h3 className="text-[10px] uppercase tracking-[0.22em] text-[#d6b46a]">{label}</h3>
        <span className="font-mono text-xs text-white/55">{records.length}</span>
      </div>
      {records.length ? (
        <ul className="max-h-80 space-y-2 overflow-auto pr-1">
          {records.map((record, index) => (
            <RecordRow key={`${label}-${index}-${scalar(record.id)}`} record={record} index={index} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/40">Sin registros.</p>
      )}
    </section>
  );
}

export default function ExecutionStatePanel({ caseId }: ExecutionStatePanelProps) {
  const [state, setState] = useState<ExecutionStateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const cleanCaseId = caseId.trim();

  useEffect(() => {
    const controller = new AbortController();

    async function loadExecutionState() {
      if (!cleanCaseId) {
        setState(null);
        setError('case_id requerido');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ case_id: cleanCaseId });
        const response = await fetch(`/api/scorefriction/execution-state?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const json = (await response.json()) as ExecutionStateResponse;

        if (!response.ok) {
          throw new Error(json.error || `execution_state_${response.status}`);
        }

        setState(json);
      } catch (err) {
        if (controller.signal.aborted) return;
        setState(null);
        setError(err instanceof Error ? err.message : 'execution_state_failed');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadExecutionState();

    return () => controller.abort();
  }, [cleanCaseId, refreshKey]);

  const totalRecords = useMemo(() => {
    if (!state) return 0;
    return buckets.reduce((sum, bucket) => sum + (state[bucket.key]?.length ?? 0), 0);
  }, [state]);

  return (
    <section className="mt-6 border border-[#d6b46a]/30 bg-white/[0.025] p-4">
      <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/35">Execution State</p>
          <h2 className="mt-2 break-words text-lg font-semibold text-white">{cleanCaseId || 'sin case_id'}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#d6b46a]">
            {loading ? 'loading' : `${totalRecords} records`}
          </span>
          <button
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
            disabled={loading || !cleanCaseId}
            className="border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/65 hover:border-[#d6b46a]/60 hover:text-[#d6b46a] disabled:opacity-40"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="mb-4 border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}

      <div className="grid gap-3 lg:grid-cols-3">
        {buckets.map((bucket) => (
          <BucketBlock key={bucket.key} label={bucket.label} records={state?.[bucket.key] ?? []} />
        ))}
      </div>
    </section>
  );
}
