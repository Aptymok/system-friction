# ============================================================
# SFI - Cognitive Runtime
# Extract probeTable() into tableProbe.ts
# Windows PowerShell
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================="
Write-Host " SFI Probe Extraction"
Write-Host "========================================="
Write-Host ""

if (!(Test-Path "package.json")) {
    Write-Error "Ejecuta este script desde la raíz del repositorio."
    exit 1
}

New-Item `
    -ItemType Directory `
    -Force `
    -Path "src/lib/sfi/cognitive-runtime" | Out-Null

Write-Host "Creando tableProbe.ts..."

@'
import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export type TableProbe = {
  table: string;
  ok: boolean;
  count: number | null;
  observedAt: string | null;
  warning: string | null;
};

export async function probeTable(table: string): Promise<TableProbe> {
  try {
    const service = createServiceSupabaseClient();

    const { data, error } =
      await service
        .from(table)
        .select('*')
        .limit(1);

    if (error) throw error;

    const row =
      Array.isArray(data)
        ? data[0] as Record<string, unknown> | undefined
        : undefined;

    const observedAt =
      typeof row?.updated_at === 'string'
        ? row.updated_at
        : typeof row?.observed_at === 'string'
          ? row.observed_at
          : typeof row?.created_at === 'string'
            ? row.created_at
            : null;

    return {
        table,
        ok: true,
        count: Array.isArray(data) ? data.length : 0,
        observedAt,
        warning: null
    };
  }
  catch (error) {

    return {
      table,
      ok: false,
      count: null,
      observedAt: null,
      warning:
        error instanceof Error
          ? error.message
          : 'table_probe_failed'
    };
  }
}
'@ | Set-Content `
      "src/lib/sfi/cognitive-runtime/tableProbe.ts" `
      -Encoding UTF8

Write-Host ""
Write-Host "========================================="
Write-Host "IMPORTANTE"
Write-Host "========================================="
Write-Host ""

Write-Host "runtime.ts debe quedar con:"

Write-Host ""

Write-Host "import { probeTable, type TableProbe } from './tableProbe';"

Write-Host ""

Write-Host "y debe ELIMINARSE completamente:"

Write-Host ""

Write-Host "import { createServiceSupabaseClient } from '@/runtime/supabase/server';"

Write-Host ""
Write-Host "type TableProbe {...}"
Write-Host ""
Write-Host "async function probeTable(...) {...}"
Write-Host ""

Write-Host "========================================="

if (Test-Path node_modules) {

    Write-Host ""
    Write-Host "check:boundaries..."
    npm run check:boundaries

    Write-Host ""
    Write-Host "typecheck..."
    npm run typecheck

}

Write-Host ""
Write-Host "========================================="
Write-Host "Listo."
Write-Host "========================================="

Write-Host ""

git status