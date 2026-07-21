$ErrorActionPreference = "Stop"

Write-Host "==============================================="
Write-Host " SFI PHASE 01 - SYNC + AUDIT"
Write-Host "==============================================="

$root = Get-Location

Write-Host ""
Write-Host "[1/8] Verificando repo..."

git status
git branch --show-current

$current = git branch --show-current

if ($current -ne "main") {
    Write-Host "Cambiando a main..."
    git checkout main
}

Write-Host ""
Write-Host "[2/8] Actualizando referencias remotas..."

git fetch origin

Write-Host ""
Write-Host "[3/8] Sincronizando main..."

git pull origin main

Write-Host ""
Write-Host "[4/8] Creando snapshot local..."

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

git tag "phase01-before-audit-$stamp"

Write-Host "Tag creado:"
git tag --points-at HEAD


Write-Host ""
Write-Host "[5/8] Verificando archivos críticos..."

$files = @(
"src/components/root/sovereign/views/RootPhenomenologicalObservatory.tsx",
"src/components/root/sovereign/root-phenomenological-observatory.css",
"src/components/root/sovereign/visual/GovernancePipeline.tsx",
"src/components/studio/StudioPipelineRail.tsx",
"src/lib/sfi/runtime/lowInjectionRuntime.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "OK $file"
    }
    else {
        Write-Host "MISSING $file"
    }
}


Write-Host ""
Write-Host "[6/8] Buscando riesgos Phase 01..."

Get-ChildItem -Recurse -Include *.ts,*.tsx |
Select-String "TODO|FIXME|catch|throw new Error" |
Out-File ".phase01-audit-$stamp.txt"


Write-Host ""
Write-Host "[7/8] Ejecutando TypeScript check..."

if (Test-Path "package.json") {

    npm run typecheck

}
else {

    Write-Host "No package.json encontrado"

}


Write-Host ""
Write-Host "[8/8] Estado final..."

git status

Write-Host ""
Write-Host "==============================================="
Write-Host " PHASE 01 AUDIT COMPLETE"
Write-Host " Report:"
Write-Host ".phase01-audit-$stamp.txt"
Write-Host " Snapshot:"
Write-Host "phase01-before-audit-$stamp"
Write-Host "==============================================="