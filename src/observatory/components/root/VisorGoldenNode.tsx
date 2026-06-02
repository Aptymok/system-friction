'use client';

export function VisorGoldenNode({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-1/2 top-1/2 z-[90] grid h-32 w-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[#d4af37]/80 bg-[#d4af37]/12 shadow-[0_0_70px_rgba(212,175,55,0.28)] outline-none transition hover:bg-[#d4af37]/18 focus-visible:ring-1 focus-visible:ring-[#d4af37]"
      aria-label="Open SFI Visor Chat"
    >
      <span className="absolute h-16 w-16 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/20" />
      <span className="relative font-mono text-[10px] uppercase tracking-[0.2em] text-[#f4d77a]">
        {label}
      </span>
    </button>
  );
}
