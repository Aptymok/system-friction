import { SfiFieldCanvas } from './SfiFieldCanvas';
import { SfiMark } from './SfiMark';

export function SfiLoadingField({ label = 'CARGANDO CAMPO' }: { label?: string }) {
  return (
    <div className="sfi-screen relative grid min-h-[280px] place-items-center overflow-hidden border border-[#c8a95114]">
      <SfiFieldCanvas className="absolute inset-0 opacity-70" density={0.38} drift={0.5} />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <SfiMark className="h-14 w-14 animate-pulse" />
        <div className="sfi-title text-[10px] text-[#c8a95199]">{label}</div>
      </div>
    </div>
  );
}
