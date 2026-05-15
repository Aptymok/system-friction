import { getState, setState } from "./systemState";

export function applyBackpressure(divergence: number, actions: any[]) {
  const state = getState();

  let newActions = actions;

  // 🔴 NIVEL 1: alerta
  if (divergence > 0.6) {
    state.phase = "warning";
  }

  // 🔴 NIVEL 2: reducción
  if (divergence > 0.8) {
    state.phase = "recovery";

    // solo 1 acción crítica
    newActions = actions.slice(0, 1);
  }

  // 🔴 NIVEL 3: bloqueo parcial
  if (divergence > 0.95) {
    state.phase = "lockdown";

    newActions = []; // no ejecutar nada
  }

  setState(state);

  return newActions;
}