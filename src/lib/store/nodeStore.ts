import { create } from 'zustand';

// Definimos qué información guarda el nodo
interface NodeState {
  metrics: {
    ihg: number;        // Homeostasis
    nti: number;        // Trazabilidad
    divergence: number; // Riesgo
  };
  status: 'operational' | 'standby' | 'critical';
  logs: Array<{type: string, content: string, timestamp: string}>;
  
  // LAS "ACCIONES" (Lo que actualiza el store)
  updateMetrics: (newMetrics: Partial<NodeState['metrics']>) => void;
  addLog: (content: string, type?: string) => void;
  setStatus: (status: NodeState['status']) => void;
}

export const useNodeStore = create<NodeState>((set) => ({
  // Valores iniciales (El nodo al arrancar)
  metrics: { ihg: 0.85, nti: 0.92, divergence: 0.05 },
  status: 'operational',
  logs: [{ type: 'system', content: 'Nodo Soberano Iniciado', timestamp: new Date().toISOString() }],

  // FUNCIÓN PARA ACTUALIZAR MÉTRICAS
  updateMetrics: (newMetrics) => set((state) => ({
    metrics: { ...state.metrics, ...newMetrics }
  })),

  // FUNCIÓN PARA AÑADIR MENSAJES A LA CONSOLA
  addLog: (content, type = 'info') => set((state) => ({
    logs: [{ type, content, timestamp: new Date().toISOString() }, ...state.logs].slice(0, 50)
  })),

  // FUNCIÓN PARA CAMBIAR EL ESTADO
  setStatus: (status) => set({ status }),
}));