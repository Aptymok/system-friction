'use client';

import { useEffect, useMemo } from 'react';
import { buildRootLogbookEntries, type RootLogbookEntry } from '@/lib/root/rootLogbookTranslator';
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
      logbook?: unknown[];
      events?: unknown[];
      mutations?: unknown[];
    };
  };
};

function field(label: string, value: string) {
  return (
    <p>
      <span className="uppercase tracking-[0.14em] text-white/25">{label}:</span> {value}
    </p>
  );
}

function RootLogbookAccordion({
  entries,
  onOpenEntry,
}: {
  entries: RootLogbookEntry[];
  onOpenEntry: (entry: RootLogbookEntry, action: string) => void;
}) {
  return (
    <section className="absolute bottom-6 left-6 z-[88] max-h-[46vh] w-[min(420px,calc(100vw-32px))] overflow-hidden border border-white/10 bg-black/80 shadow-2xl">
      <header className="border-b border-white/10 px-3 py-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d4af37]">Bitacora / indice visible</h3>
        <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white/30">origen / capa / evidencia / cierre</p>
      </header>
      <div className="max-h-[38vh] overflow-y-auto p-3">
        {entries.length === 0 ? (
          <p className="border-l border-white/15 px-3 py-2 font-mono text-[11px] leading-5 text-white/45">
            Sin entradas visibles suficientes. No lo trato como evidencia real; falta una fuente conectada al estado ROOT.
          </p>
        ) : entries.map((entry) => (
          <details key={entry.id} className="mb-3 border border-white/10 bg-white/[0.025] p-3 last:mb-0" open={false}>
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-3 font-mono text-[8px] uppercase tracking-[0.16em]">
                <span className="text-[#d4af37]">{entry.origin}</span>
                <span className="text-white/25">{entry.date}</span>
              </div>
              <p className="mt-2 font-mono text-[11px] leading-5 text-white/65">{entry.title}</p>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white/30">{entry.layerLabel} / {entry.state.label}</p>
            </summary>
            <div className="mt-3 space-y-1 border-t border-white/10 pt-3 font-mono text-[9px] leading-4 text-white/45">
              {field('importa porque', entry.whyItMatters)}
              {field('nodo afectado', entry.nodeAffected)}
              {field('patron alimentado', entry.patternFed)}
              {field('objetivo tocado', entry.objectiveTouched)}
              {field('evidencia adjunta', entry.evidenceAttached)}
              {field('peso general', entry.generalWeight)}
              {field('peso direccional', entry.directionalWeight)}
              {field('falta', entry.whatIsMissing)}
              {field('accion abierta', entry.openAction)}
              <div className="mt-3 flex flex-wrap gap-2">
                {['Abrir entrada relacionada', 'Ver evidencia', 'Ir al nodo afectado', 'Ver en Atlas'].map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => onOpenEntry(entry, action)}
                    className="border border-[#d4af37]/30 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#d4af37] hover:bg-[#d4af37]/10"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </details>
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
  const logbookEntries = useMemo(() => buildRootLogbookEntries(twin), [twin]);
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
        VISOR MODE / lectura libre
      </div>

      <VisorSidebar activeContext={contextKey} onSelect={(nextContext) => {
        setContextKey(nextContext);
        chat.setOpen(true);
      }} />

      <VisorGoldenNode label="ROOT VISOR" onClick={() => chat.setOpen(true)} />

      {contextKey === 'bitacoras' ? (
        <RootLogbookAccordion
          entries={logbookEntries}
          onOpenEntry={(entry, action) => {
            chat.setOpen(true);
            void chat.submit(`${action}: ${entry.title}. Nodo: ${entry.nodeAffected}. Falta: ${entry.whatIsMissing}.`);
          }}
        />
      ) : null}

      <div className="absolute bottom-6 left-1/2 z-[85] -translate-x-1/2 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-white/30">
        indice orientativo / {context.description}
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
