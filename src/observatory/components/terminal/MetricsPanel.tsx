import { useNodeStore } from '@/observatory/store/nodeStore';

export const MetricsPanel = () => {
  const { metrics, status } = useNodeStore();

  return (
    <div className="space-y-6 font-mono text-xs">
      <div className="border border-green-900/50 p-3 bg-black/50">
        <h3 className="text-green-500 mb-2 border-b border-green-900 pb-1">INSTRUMENTACIÓN</h3>
        <div className="grid grid-cols-2 gap-2">
          <span>IHG (Homeostasis):</span>
          <span className={metrics.ihg < 0 ? 'text-red-500' : 'text-blue-400'}>{metrics.ihg.toFixed(4)}</span>
          <span>NTI (Trazabilidad):</span>
          <span className="text-yellow-500">{metrics.nti.toFixed(4)}</span>
          <span>DIVERGENCIA:</span>
          <span className="text-purple-400">{(metrics.divergence * 100).toFixed(1)}%</span>
        </div>
      </div>

      <div className="border border-green-900/50 p-3 bg-black/50">
        <h3 className="text-green-500 mb-2 border-b border-green-900 pb-1">ESTADO DEL NODO</h3>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${status === 'operational' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="uppercase">{status}</span>
        </div>
      </div>

      {/* Visualización del Atractor */}
      <div className="h-32 border border-green-900/30 relative overflow-hidden bg-zinc-950">
        <div 
          className="absolute bg-blue-500/20 rounded-full blur-xl transition-all duration-1000"
          style={{ 
            width: '60px', 
            height: '60px', 
            left: `${50 + (metrics.ihg * 40)}%`, 
            top: `${50 - (metrics.nti * 40)}%` 
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-700">
          MAPA DE TRAYECTORIA
        </div>
      </div>
    </div>
  );
};
