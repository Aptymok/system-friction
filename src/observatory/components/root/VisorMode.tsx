'use client';

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

export function VisorMode({
  enabled,
  twin,
}: {
  enabled: boolean;
  twin: TwinState | null;
}) {
  const { contextKey, context, setContextKey } = useVisorContext('nodes');
  const chat = useVisorChat(contextKey, twin);

  if (!enabled) return null;

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

      <VisorGoldenNode label={context.label.toUpperCase()} onClick={() => chat.setOpen(true)} />

      <div className="absolute bottom-6 left-1/2 z-[85] -translate-x-1/2 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-white/30">
        observer / {context.description}
      </div>

      <VisorChat
        open={chat.open}
        context={context}
        messages={chat.messages}
        onSubmit={chat.submit}
        onClose={() => chat.setOpen(false)}
      />
    </div>
  );
}
