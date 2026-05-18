import {
  getKernelState as readKernelState,
  setKernelState,
  updateKernelState,
  type KernelState,
} from '@/lib/kernel/kernelState';

let state: KernelState = {
  routes: {},
  tickVersion: 1,
  lastRebuild: Date.now(),
};

export async function loadKernelState() {
  state = await readKernelState();
}

export async function saveKernelState() {
  state = await setKernelState(state);
}

// REGISTRO AUTOMATICO DE RUTAS
export async function registerRoute(path: string) {
  state = await updateKernelState((current) => ({
    ...current,
    routes: {
      ...current.routes,
      [path]: {
        path,
        exists: true,
        lastSeen: Date.now(),
        health: 'ok',
      },
    },
  }));
}

// DETECCION EN RUNTIME
export async function scanRoutes(expectedRoutes: string[]) {
  state = await updateKernelState((current) => {
    const routes = { ...current.routes };

    for (const route of expectedRoutes) {
      if (!routes[route]) {
        routes[route] = {
          path: route,
          exists: false,
          lastSeen: Date.now(),
          health: 'missing',
        };
      }
    }

    return { ...current, routes };
  });
}

// REPARACION AUTOMATICA
export async function healRoutes(generator: () => string[]) {
  const missing = Object.values(state.routes).filter(
    (route) => route.health !== 'ok',
  );

  if (missing.length === 0) return;

  const regenerated = generator();

  state = await updateKernelState((current) => {
    const routes = { ...current.routes };

    for (const path of regenerated) {
      routes[path] = {
        path,
        exists: true,
        lastSeen: Date.now(),
        health: 'ok',
      };
    }

    return {
      ...current,
      routes,
      lastRebuild: Date.now(),
    };
  });
}

// META-RECONFIGURACION DEL KERNEL TICK
export async function evolveTick(fn: (prev: number) => number) {
  state = await updateKernelState((current) => ({
    ...current,
    tickVersion: fn(current.tickVersion),
  }));
}

export function getKernelState() {
  return state;
}
