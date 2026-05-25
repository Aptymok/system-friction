// Límites absolutos que el sistema NO puede cruzar
export const HARD_LIMITS = {
  maxChangesPerDay: 10,
  maxNewRoutesPerDay: 3,
  maxStructuralChangesPerWeek: 2,
  maxRecompilationsPerHour: 1,
  maxRuntimePatches: 5,
  safetyBackupIntervalHours: 6,
  rollbackWindowMinutes: 30,
};

export const PROTECTED_PATHS = [
  "src/lib/atlas/ontology.py",
  "src/experimental/kernel/metaKernel.ts",
  "src/runtime/kernel/bootstrap.ts",
  "src/runtime/kernel/systemTick.ts"
];

let changeCounters = {
  changesToday: 0,
  newRoutesToday: 0,
  structuralChangesThisWeek: 0,
  recompilationsThisHour: 0,
  activePatches: 0,
  lastChangeDate: new Date(),
  lastRecompilationHour: new Date().getHours(),
};

export function canSelfModify(): boolean {
  resetCountersIfNeeded();
  return changeCounters.changesToday < HARD_LIMITS.maxChangesPerDay;
}

export function canCreateRoute(): boolean {
  resetCountersIfNeeded();
  return changeCounters.newRoutesToday < HARD_LIMITS.maxNewRoutesPerDay;
}

export function canStructuralChange(): boolean {
  resetCountersIfNeeded();
  return changeCounters.structuralChangesThisWeek < HARD_LIMITS.maxStructuralChangesPerWeek;
}

export function canRecompile(): boolean {
  resetCountersIfNeeded();
  const now = new Date();
  if (now.getHours() !== changeCounters.lastRecompilationHour) {
    changeCounters.recompilationsThisHour = 0;
    changeCounters.lastRecompilationHour = now.getHours();
  }
  return changeCounters.recompilationsThisHour < HARD_LIMITS.maxRecompilationsPerHour;
}

export function canApplyPatch(): boolean {
  return changeCounters.activePatches < HARD_LIMITS.maxRuntimePatches;
}

export function recordChange(type: 'modification' | 'route' | 'structural' | 'recompilation' | 'patch') {
  resetCountersIfNeeded();
  switch (type) {
    case 'modification':
      changeCounters.changesToday++;
      break;
    case 'route':
      changeCounters.newRoutesToday++;
      break;
    case 'structural':
      changeCounters.structuralChangesThisWeek++;
      break;
    case 'recompilation':
      changeCounters.recompilationsThisHour++;
      break;
    case 'patch':
      changeCounters.activePatches++;
      break;
  }
  persistCounters();
}

function resetCountersIfNeeded() {
  const now = new Date();
  if (now.toDateString() !== changeCounters.lastChangeDate.toDateString()) {
    changeCounters.changesToday = 0;
    changeCounters.newRoutesToday = 0;
    changeCounters.lastChangeDate = now;
  }
}

function persistCounters() {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') return;

  const fs = require('fs');
  fs.writeFileSync('.evolution-counters.json', JSON.stringify(changeCounters));
}

export function loadCounters() {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') return;

  const fs = require('fs');
  if (fs.existsSync('.evolution-counters.json')) {
    changeCounters = JSON.parse(fs.readFileSync('.evolution-counters.json', 'utf8'));
  }
}
