'use client';

export function VisorGoldenNode({
  label,
  onClick,
  dormant = false,
}: {
  label: string;
  onClick: () => void;
  dormant?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pointer-events-auto absolute top-1/2 z-[90] grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[#d4af37]/80 bg-[#d4af37]/12 shadow-[0_0_70px_rgba(212,175,55,0.28)] outline-none transition hover:bg-[#d4af37]/18 focus-visible:ring-1 focus-visible:ring-[#d4af37] ${
        dormant ? 'left-[calc((100%_-_380px)/2)] h-28 w-28 max-lg:left-1/2' : 'left-1/2 h-32 w-32'
      }`}
      aria-label="Abrir ROOT VISOR; puerta del Visor, no nodo observable"
      title="Puerta del Visor; no es nodo observable ni evidencia"
    >
      <span className="absolute h-16 w-16 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/20" />
      <span className="relative text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#f4d77a]">
        {label}
      </span>
    </button>
  );
}
