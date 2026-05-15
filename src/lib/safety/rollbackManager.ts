import { createBackup, restoreBackup } from './backupRestore';
import { HARD_LIMITS } from './hardLimits';

interface ChangeRecord {
  timestamp: number;
  module: string;
  backupPath: string;
  description: string;
}

const changeHistory: ChangeRecord[] = [];

export function recordChange(module: string, description: string): string {
  const backupPath = createBackup(module);
  const record = { timestamp: Date.now(), module, backupPath, description };
  changeHistory.unshift(record);
  // Mantener solo últimas 50
  if (changeHistory.length > 50) changeHistory.pop();
  // Persistir (opcional)
  return backupPath;
}

export function rollbackLastChange(module: string): boolean {
  const last = changeHistory.find(c => c.module === module);
  if (!last) return false;
  const ageMinutes = (Date.now() - last.timestamp) / 60000;
  if (ageMinutes > HARD_LIMITS.rollbackWindowMinutes) {
    console.log(`[rollback] Ventana de rollback expirada para ${module}`);
    return false;
  }
  restoreBackup(module, last.backupPath);
  // Eliminar el registro
  const idx = changeHistory.findIndex(c => c === last);
  if (idx !== -1) changeHistory.splice(idx, 1);
  return true;
}

export function emergencyRollback(module: string): boolean {
  const backups = changeHistory.filter(c => c.module === module);
  if (backups.length === 0) return false;
  const latest = backups[0];
  restoreBackup(module, latest.backupPath);
  return true;
}
