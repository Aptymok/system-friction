'use client';

import { useState } from 'react';
import type { VisorChatMessage, VisorContextItem } from './visorTypes';

export function VisorChat({
  open,
  context,
  messages,
  onSubmit,
  onClose,
}: {
  open: boolean;
  context: VisorContextItem;
  messages: VisorChatMessage[];
  onSubmit: (prompt: string) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState('');
  if (!open) return null;

  function submit() {
    const prompt = input.trim();
    if (!prompt) return;
    onSubmit(prompt);
    setInput('');
  }

  return (
    <section className="absolute right-6 top-16 z-[100] flex h-[min(680px,calc(100vh-96px))] w-[min(440px,calc(100vw-32px))] flex-col border border-white/15 bg-black/95 shadow-2xl">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#d4af37]">SFI Visor Chat</h2>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/35">{context.label} / {context.description}</p>
          </div>
          <button type="button" onClick={onClose} className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45 hover:text-white">
            cerrar
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`border-l px-3 py-2 font-mono text-[11px] leading-5 ${
              message.role === 'user'
                ? 'border-white/20 text-white/75'
                : 'border-[#d4af37]/45 bg-white/[0.025] text-white/55'
            }`}
          >
            <div className="mb-1 text-[8px] uppercase tracking-[0.18em] text-white/25">{message.role === 'user' ? 'consulta' : 'visor'}</div>
            {message.text}
          </div>
        ))}
      </div>
      <footer className="border-t border-white/10 p-3">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={`Ask about ${context.label}...`}
          className="h-24 w-full resize-none border border-white/10 bg-white/[0.025] p-3 font-mono text-[11px] leading-5 text-white/75 outline-none placeholder:text-white/20 focus:border-[#d4af37]/45"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/25">observa / interroga / no ejecuta</span>
          <button type="button" onClick={submit} className="border border-[#d4af37]/45 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#d4af37] hover:bg-[#d4af37]/10">
            preguntar
          </button>
        </div>
      </footer>
    </section>
  );
}
