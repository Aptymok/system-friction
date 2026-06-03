'use client';

import { useEffect, useMemo } from 'react';
import { VisorChat } from './VisorChat';
import { VisorGoldenNode } from './VisorGoldenNode';
import { useVisorChat, useVisorContext } from './visorHooks';
import { VisorSidebar } from './VisorSidebar';

type TwinState = {
  ok?: boolean;
  data?: {
    proposals?: unknown[];
    seed?: {
      nodeCatalog?: unknown[];
      documentCatalog?: unknown[];
      patternCatalog?: unknown[];
      recentEvents?: unknown[];
    };
  };
};

type LogbookEntry = {
  id: string;
  actor: 'Usuario' | 'Sistema' | 'Agente' | 'Evento';
  timestamp?: string;
  summary: string;
};

function valueText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function actorFor(event: Record<string, unknown>): LogbookEntry['actor'] {
  const source = `${valueText(event.actor) || valueText(event.source) || valueText(event.role) || valueText(event.type) || ''}`.toLowerCase();
  if (source.includes('user') || source.includes('usuario')) return 'Usuario';
  if (source.includes('agent') || source.includes('agente')) return 'Agente';
  if (source.includes('system') || source.includes('sistema')) return 'Sistema';
  return 'Evento';
}

function summaryFor(event: unknown) {
  if (typeof event === 'string') return event;
  if (!event || typeof event !== 'object') return undefined;
  const record = event as Record<string, unknown>;
  return valueText(record.summary)
    || valueText(record.message)
    || valueText(record.description)
    || valueText(record.title)
    || valueText(record.label)
    || valueText(record.event)
    || valueText(record.type);
}

function timestampFor(event: unknown) {
  if (!event || typeof event !== 'object') return undefined;
  const record = event as Record<string, unknown>;
  return valueText(record.timestamp) || valueText(record.createdAt) || valueText(record.created_at) || valueText(record.time) || valueText(record.date);
}

function mapLogbookEntries(events: unknown[] | undefined): LogbookEntry[] {
  if (!Array.isArray(events)) return [];
  return events.map((event, index) => {
    const record = event && typeof event === 'object' ? event as Record<string, unknown> : {};
    const summary = summaryFor(event);
    if (!summary) return null;
    return {
      id: valueText(record.id) || `event-${index}`,
      actor: actorFor(record),
      timestamp: timestampFor(event),
      summary,
    };
  }).filter((entry): entry is LogbookEntry => Boolean(entry));
}

function VisorLogbookPanel({
  entries,
  onAsk,
}: {
  entries: LogbookEntry[];
  onAsk: (entry: LogbookEntry) => void;
}) {
  return (
    <section className="absolute bottom-6 left-6 z-[88] max-h-[42vh] w-[min(380px,calc(100vw-32px))] overflow-hidden border border-white/10 bg-black/80 shadow-2xl">
      <header className="border-b border-white/10 px-3 py-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d4af37]">Bitácora visible</h3>
        <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white/30">recentEvents / sólo lectura</p>
      </header>
      <div className="max-h-[34vh] overflow-y-auto p-3">
        {entries.length === 0 ? (
          <p className="border-l border-white/15 px-3 py-2 font-mono text-[11px] leading-5 text-white/45">
            Bitácora sin entradas legibles. Falta mapear recentEvents/logbook a entradas Usuario/Sistema/Agente.
          </p>
        ) : entries.map((entry) => (
          <article key={entry.id} className="mb-3 border border-white/10 bg-white/[0.025] p-3 last:mb-0">
            <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[8px] uppercase tracking-[0.16em]">
              <span className="text-[#d4af37]">{entry.actor}</span>
              {entry.timestamp ? <time className="text-white/25">{entry.timestamp}</time> : null}
            </div>
            <p className="font-mono text-[11px] leading-5 text-white/60">{entry.summary}</p>
            <button
              type="button"
              onClick={() => onAsk(entry)}
              className="mt-3 border border-[#d4af37]/35 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#d4af37] hover:bg-[#d4af37]/10"
            >
              preguntar sobre esta entrada
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function VisorMode({
  enabled,
  twin,
  onEnable,
}: {
  enabled: boolean;
  twin: TwinState | null;
  onEnable: () => void;
}) {
  const { contextKey, context, setContextKey } = useVisorContext('bitacoras');
  const chat = useVisorChat(contextKey, twin);
  const logbookEntries = useMemo(() => mapLogbookEntries(twin?.data?.seed?.recentEvents), [twin]);

  const { setOpen } = chat;

  useEffect(() => {
    if (enabled) setOpen(true);
  }, [enabled, setOpen]);

  function activateVisor() {
    onEnable();
    chat.setOpen(true);
  }

  if (!enabled) {
    return (
      <div className="pointer-events-none absolute inset-0 z-30">
        <VisorGoldenNode label="ROOT VISOR" onClick={activateVisor} dormant />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[70] overflow-hidden bg-[#030303]/96 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),rgba(0,0,0,0.86)_48%,#000_78%)]" />
      <div className="absolute inset-0 backdrop-grayscale" />

      <div className="absolute left-1/2 top-4 z-[85] -translate-x-1/2 border border-white/10 bg-black/75 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.24em] text-white/45">
        VISOR MODE / SYSTEM FREEZE
      </div>

      <VisorSidebar activeContext={contextKey} onSelect={(nextContext) => {
        setContextKey(nextContext);
        chat.setOpen(true);
      }} />

      <VisorGoldenNode label="ROOT VISOR" onClick={() => chat.setOpen(true)} />

      {contextKey === 'bitacoras' ? (
        <VisorLogbookPanel
          entries={logbookEntries}
          onAsk={(entry) => {
            chat.setOpen(true);
            void chat.submit(`Pregunta sobre esta entrada de bitácora (${entry.actor}${entry.timestamp ? ` / ${entry.timestamp}` : ''}): ${entry.summary}`);
          }}
        />
      ) : null}

      <div className="absolute bottom-6 left-1/2 z-[85] -translate-x-1/2 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-white/30">
        observer / {context.description}
      </div>

      <VisorChat
        open={chat.open}
        context={context}
        messages={chat.messages}
        loading={chat.loading}
        onSubmit={chat.submit}
        onClose={() => chat.setOpen(false)}
      />
    </div>
  );
}
