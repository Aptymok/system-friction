import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), '.backups');

export function createBackup(modulePath: string): string {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const timestamp = Date.now();
  const backupName = `${path.basename(modulePath)}.${timestamp}.backup`;
  const backupPath = path.join(BACKUP_DIR, backupName);
  fs.copyFileSync(modulePath, backupPath);
  console.log(`[backup] Creado backup de ${modulePath} → ${backupPath}`);
  return backupPath;
}

export function restoreBackup(modulePath: string, backupPath: string) {
  if (!fs.existsSync(backupPath)) throw new Error(`Backup no encontrado: ${backupPath}`);
  fs.copyFileSync(backupPath, modulePath);
  console.log(`[backup] Restaurado ${modulePath} desde ${backupPath}`);
}

export function listBackups(modulePath?: string): string[] {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  const files = fs.readdirSync(BACKUP_DIR);
  if (modulePath) {
    const base = path.basename(modulePath);
    return files.filter(f => f.startsWith(base)).map(f => path.join(BACKUP_DIR, f));
  }
  return files.map(f => path.join(BACKUP_DIR, f));
}
