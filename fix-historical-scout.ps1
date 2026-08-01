<#
  SFI — fix-historical-scout.ps1
  Aplica el siguiente punto de continuidad de operation-0-reconciliation-v3.md:
    "2. De los 10 agentes GATED, priorizar Historical Reconstruction
        (historical_scout, phenotype_resolver, context_builder) — es la única
        fila sin ninguna pieza real subyacente"
  phenotype_resolver y context_builder ya tienen lógica real en el repo.
  historical_scout seguía siendo un stub (solo marcaba executed:true sin leer
  evidencia). Este script lo reemplaza por una implementación real, consistente
  con el patrón de los otros dos agentes y con su sourceTables declarado en
  registry.ts (sfi_phenomena, sfi_phenomenon_evidence).

  Uso:
    .\fix-historical-scout.ps1 [-RepoPath "C:\ruta\a\system-friction"] [-Push]
#>

param(
  [string]$RepoPath = (Get-Location).Path,
  [switch]$Push
)

$ErrorActionPreference = "Stop"

function Fail($msg) {
  Write-Host "ERROR: $msg" -ForegroundColor Red
  exit 1
}

# 1. Validaciones previas
if (-not (Test-Path $RepoPath)) { Fail "No existe la ruta $RepoPath" }
Set-Location $RepoPath

if (-not (Test-Path ".git")) { Fail "No es un repo git: $RepoPath" }

$targetRel = "src/lib/sfi/cognitive-runtime/agents/historicalscout.ts"
$targetFile = Join-Path $RepoPath $targetRel
if (-not (Test-Path $targetFile)) { Fail "No se encontró $targetRel — verifica que este sea Aptymok/system-friction" }

$status = git status --porcelain
if ($status) {
  Write-Host "AVISO: hay cambios sin commitear en el working tree. El script continuará," -ForegroundColor Yellow
  Write-Host "pero revisa 'git status' antes de hacer push." -ForegroundColor Yellow
}

Write-Host "== Actualizando referencia local (git fetch) ==" -ForegroundColor Cyan
git fetch origin 2>&1 | Out-Null

$branch = "fix/historical-scout-real-logic-op0"
Write-Host "== Creando rama $branch ==" -ForegroundColor Cyan
git checkout -B $branch

# 2. Reemplazo del stub por la implementación real
Write-Host "== Escribiendo implementación real de HistoricalScoutAgent ==" -ForegroundColor Cyan

$newContent = @'
import type {
  KernelContext,
  KernelEvidence
} from "../kernelContext";


const PHENOMENON_SOURCE_TABLES = [
  "sfi_phenomena",
  "sfi_phenomenon_evidence"
];


export interface HistoricalPrecedent {
  evidenceId: string;
  source: string;
  recency: "declared" | "undated";
  confidence: number;
}


export function HistoricalScoutAgent(
  context: KernelContext
): KernelContext {

  const evidence = context.evidence ?? [];

  const precedents: HistoricalPrecedent[] = evidence
    .filter(item =>
      PHENOMENON_SOURCE_TABLES.some(table =>
        item.source.toLowerCase().includes(table)
      )
    )
    .map(item => {
      const payloadText = JSON.stringify(item.payload).toLowerCase();

      const hasTemporalMarker =
        /\b(19|20)\d{2}\b/.test(payloadText) ||
        payloadText.includes("fecha") ||
        payloadText.includes("timestamp");

      return {
        evidenceId: item.id,
        source: item.source,
        recency: hasTemporalMarker ? ("declared" as const) : ("undated" as const),
        confidence: item.confidence
      };
    });

  const declaredCount = precedents.filter(p => p.recency === "declared").length;

  const confidence =
    precedents.length === 0
      ? 0
      : Math.min(
          (declaredCount / precedents.length) *
            (precedents.length / (evidence.length || 1)),
          1
        );

  const reconstruction = {
    precedentsFound: precedents.length,
    precedentsWithTimeline: declaredCount,
    precedents
  };

  const generatedEvidence: KernelEvidence = {
    id: crypto.randomUUID(),
    source: "HistoricalScoutAgent",
    confidence,
    payload: reconstruction
  };

  context.evidence.push(generatedEvidence);

  context.metadata = {
    ...context.metadata,
    historicalScout: {
      executed: true,
      precedentsFound: precedents.length,
      confidence,
      executedAt: new Date().toISOString()
    }
  };

  return context;
}
'@

# BOM UTF-8, igual que el resto de los archivos del repo (evita diffs de encoding)
$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($targetFile, $newContent, $utf8Bom)

# 3. Validación: typecheck real contra el repo del usuario
Write-Host "== Instalando dependencias (si hace falta) ==" -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
  npm install
  if ($LASTEXITCODE -ne 0) { Fail "npm install falló" }
}

Write-Host "== Corriendo typecheck ==" -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) {
  Fail "typecheck falló tras el cambio — revisa la salida de tsc arriba antes de commitear"
}
Write-Host "typecheck OK" -ForegroundColor Green

# 4. Commit
Write-Host "== Commiteando ==" -ForegroundColor Cyan
git add -- $targetRel
git commit -m "fix(cognitive-runtime): implementa lógica real de HistoricalScoutAgent

Reemplaza el stub (solo marcaba executed:true) por reconstrucción real a
partir de context.evidence, filtrando por sourceTables declarado en
registry.ts (sfi_phenomena, sfi_phenomenon_evidence) y detectando marcadores
temporales en el payload. Sigue el mismo patrón que PhenotypeResolverAgent y
ContextBuilderAgent.

Cierra el punto 2 de la continuidad de operation-0-reconciliation-v3.md:
de los 3 agentes de Historical Reconstruction, historical_scout era el único
sin pieza real subyacente."

if ($LASTEXITCODE -ne 0) { Fail "git commit falló" }

Write-Host "== Listo. Rama: $branch ==" -ForegroundColor Green

if ($Push) {
  Write-Host "== Pusheando a origin ==" -ForegroundColor Cyan
  git push -u origin $branch
  if ($LASTEXITCODE -ne 0) { Fail "git push falló" }
  Write-Host "Pusheado. Abre el PR desde $branch." -ForegroundColor Green
} else {
  Write-Host "No se hizo push (usa -Push para hacerlo, o revisa el commit y pushea manualmente)." -ForegroundColor Yellow
}
