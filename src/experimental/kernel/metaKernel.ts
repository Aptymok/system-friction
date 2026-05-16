type RouteState = {
  path: string;
  exists: boolean;
  lastSeen: number;
  health: "ok" | "missing" | "corrupt";
};

type KernelState = {
  routes: Record<string, RouteState>;
  tickVersion: number;
  lastRebuild: number;
};

let state: KernelState = {
  routes: {},
  tickVersion: 1,
  lastRebuild: Date.now(),
};

// Persistencia simple (archivo)
const fs = require("fs");
const STATE_FILE = ".kernel-state.json";

export function loadKernelState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
      state = { ...state, ...data };
    } catch (e) {}
  }
}

export function saveKernelState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// REGISTRO AUTOMÁTICO DE RUTAS
export function registerRoute(path: string) {
  state.routes[path] = {
    path,
    exists: true,
    lastSeen: Date.now(),
    health: "ok",
  };
  saveKernelState();
}

// DETECCIÓN EN RUNTIME
export function scanRoutes(expectedRoutes: string[]) {
  for (const r of expectedRoutes) {
    if (!state.routes[r]) {
      state.routes[r] = {
        path: r,
        exists: false,
        lastSeen: Date.now(),
        health: "missing",
      };
    }
  }
  saveKernelState();
}

// REPARACIÓN AUTOMÁTICA
export function healRoutes(generator: () => string[]) {
  const missing = Object.values(state.routes).filter(r => r.health !== "ok");

  if (missing.length === 0) return;

  const regenerated = generator();

  for (const path of regenerated) {
    state.routes[path] = {
      path,
      exists: true,
      lastSeen: Date.now(),
      health: "ok",
    };
  }

  state.lastRebuild = Date.now();
  saveKernelState();
}

// META-RECONFIGURACIÓN DEL KERNEL TICK
export function evolveTick(fn: (prev: number) => number) {
  state.tickVersion = fn(state.tickVersion);
  saveKernelState();
}

export function getKernelState() {
  return state;
}
