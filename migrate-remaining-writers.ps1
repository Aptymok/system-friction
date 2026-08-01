# ============================================================
# MIGRAR WRITERS RESTANTES A ADR-017 (VERSIÓN SIMPLIFICADA)
# ============================================================
# Ejecuta desde la raíz del repositorio:
#   .\migrate-remaining-writers.ps1
#
# Modifica:
#   1. src/app/api/scorefriction/evidence/ingest/route.ts
#   2. src/lib/worldspect/logbook.ts (si existe)
# ============================================================

Write-Host ""
Write-Host "=== MIGRAR WRITERS RESTANTES A ADR-017 ===" -ForegroundColor Cyan
Write-Host ""

# ---------- 1. Evidence Ingest Route ----------
$evidenceRoute = "src\app\api\scorefriction\evidence\ingest\route.ts"
if (Test-Path $evidenceRoute) {
    Write-Host "📝 Procesando: $evidenceRoute" -ForegroundColor Yellow
    
    $content = Get-Content -Path $evidenceRoute -Raw
    
    # Verificar si ya está migrado
    if ($content -match "InstitutionalMemoryWriter") {
        Write-Host "✓ Ya migrado: $evidenceRoute" -ForegroundColor Green
    } else {
        # Agregar importaciones al inicio
        $imports = @'
import { randomUUID } from 'crypto';
import { InstitutionalMemoryWriter } from '@/lib/memory/institutionalMemoryWriter';
'@
        # Insertar después de la primera línea de importaciones
        $content = $content -replace "(import .+?from .+?;\s*)", "`$1`r`n$imports`r`n"
        
        # Buscar el bloque de inserción y reemplazarlo manualmente
        # Vamos a buscar la línea que contiene 'client.from('root_evidence_entries').insert('
        $lines = $content -split "`r`n"
        $newLines = @()
        $insideInsert = $false
        $insertBuffer = @()
        
        foreach ($line in $lines) {
            if ($line -match "client\.from\('root_evidence_entries'\)\.insert\(") {
                $insideInsert = $true
                $insertBuffer = @($line)
            } elseif ($insideInsert -and $line -match "^\s*\}\);") {
                $insideInsert = $false
                $insertBuffer += $line
                # Reemplazar el bloque completo
                $newLines += @'
    // Generar ID
    const evidenceId = randomUUID();
    
    // 1. Insertar evidencia
    const insertResult = await client.from('root_evidence_entries').insert({
      id: evidenceId,
      ...evidenceData
    });
    
    // 2. Registrar admisión en memoria institucional
    const writer = new InstitutionalMemoryWriter();
    await writer.write({
      entityType: 'EVIDENCE',
      entityId: evidenceId,
      source: {
        component: 'EvidenceService',
      },
      provenance: {
        originTable: 'scorefriction_observations',
        originId: observationId,
      },
      authorization: {
        rule: 'EVIDENCE_ADMISSION',
      },
    });
'@
            } elseif ($insideInsert) {
                $insertBuffer += $line
            } else {
                $newLines += $line
            }
        }
        
        $content = $newLines -join "`r`n"
        Set-Content -Path $evidenceRoute -Value $content
        Write-Host "✓ Migrado: $evidenceRoute" -ForegroundColor Green
    }
} else {
    Write-Host "⚠ No existe: $evidenceRoute" -ForegroundColor Gray
}

# ---------- 2. WorldSpect Logbook ----------
$logbookPath = "src\lib\worldspect\logbook.ts"
if (Test-Path $logbookPath) {
    Write-Host "📝 Procesando: $logbookPath" -ForegroundColor Yellow
    
    $content = Get-Content -Path $logbookPath -Raw
    
    if ($content -match "InstitutionalMemoryWriter") {
        Write-Host "✓ Ya migrado: $logbookPath" -ForegroundColor Green
    } else {
        # Intentar agregar Writer a logbook si hay inserciones
        if ($content -match "\.insert\(" -and $content -match "logbook_") {
            # Agregar importaciones
            $imports = @'
import { randomUUID } from 'crypto';
import { InstitutionalMemoryWriter } from '@/lib/memory/institutionalMemoryWriter';
'@
            $content = $content -replace "(import .+?from .+?;\s*)", "`$1`r`n$imports`r`n"
            
            # Reemplazar inserciones a logbook_* con Writer
            $content = $content -replace '(await\s+client\.from\([^\)]+\)\.insert\({[^}]+}\))', @'
// ADR-017: Registrar en memoria institucional
const logId = randomUUID();
const insertResult = await client.from('logbook_*').insert({
  id: logId,
  ...data
});

const writer = new InstitutionalMemoryWriter();
await writer.write({
  entityType: 'OBSERVATION',
  entityId: logId,
  source: {
    component: 'WorldSpectLogbook',
  },
  provenance: {
    originTable: 'logbook_*',
    originId: logId,
  },
  authorization: {
    rule: 'LOGBOOK_ADMISSION',
  },
});
'@
            
            Set-Content -Path $logbookPath -Value $content
            Write-Host "✓ Migrado: $logbookPath (revisar manualmente)" -ForegroundColor Green
        } else {
            Write-Host "⚠ No se encontraron escrituras a logbook_* en $logbookPath" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "⚠ No existe: $logbookPath (opcional)" -ForegroundColor Gray
}

# ---------- 3. Resumen ----------
Write-Host ""
Write-Host "=== MIGRACIÓN COMPLETADA ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Archivos procesados:"
Write-Host "  - $evidenceRoute" -ForegroundColor Gray
Write-Host "  - $logbookPath (si existe)" -ForegroundColor Gray
Write-Host ""
Write-Host "Ejecuta: npm run typecheck" -ForegroundColor Yellow
Write-Host "Ejecuta: npm run build" -ForegroundColor Yellow
Write-Host ""