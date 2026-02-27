# check-css.ps1
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   VERIFICACIÓN DE CSS - SYSTEM FRICTION ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan

# 1. Archivos CSS
Write-Host "`n📁 ARCHIVOS CSS:" -ForegroundColor White
if (Test-Path "assets/css/main.css") { 
    Write-Host "  ✅ main.css" -ForegroundColor Green 
} else { 
    Write-Host "  ❌ main.css NO EXISTE" -ForegroundColor Red 
}
if (Test-Path "assets/css/estado.css") { 
    Write-Host "  ✅ estado.css" -ForegroundColor Green 
} else { 
    Write-Host "  ❌ estado.css NO EXISTE" -ForegroundColor Red 
}

# 2. head.html
Write-Host "`n📄 HEAD.HTML:" -ForegroundColor White
if (Test-Path "_includes/head.html") {
    $content = Get-Content "_includes/head.html" -Raw
    if ($content -match "main\.css") { 
        Write-Host "  ✅ Incluye main.css" -ForegroundColor Green 
    } else { 
        Write-Host "  ❌ NO incluye main.css" -ForegroundColor Red 
    }
    if ($content -match "estado\.css") { 
        Write-Host "  ✅ Incluye estado.css" -ForegroundColor Green 
    } else { 
        Write-Host "  ❌ NO incluye estado.css" -ForegroundColor Red 
    }
} else {
    Write-Host "  ❌ head.html NO EXISTE" -ForegroundColor Red
}

# 3. Layouts
Write-Host "`n🎨 LAYOUTS:" -ForegroundColor White
$layouts = Get-ChildItem "_layouts" -Filter "*.html" 2>$null
if ($layouts) {
    foreach ($layout in $layouts) {
        $content = Get-Content $layout.FullName -Raw
        if ($content -match "include head\.html") {
            Write-Host "  ✅ $($layout.Name)" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $($layout.Name) (NO incluye head.html)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  ⚠️ No hay layouts en _layouts/" -ForegroundColor Yellow
}

# 4. CSS inline en MD
Write-Host "`n⚠️  CSS INLINE EN ARCHIVOS MD (revisar):" -ForegroundColor Yellow
$inlineCss = Get-ChildItem -Path "." -Recurse -Include "*.md" | Select-String "<style>" | Select-Object -Unique Path
if ($inlineCss) {
    foreach ($file in $inlineCss) {
        Write-Host "  🔸 $($file.Path)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✅ No hay CSS inline" -ForegroundColor Green
}

# 5. Footers en MD
Write-Host "`n❌ FOOTERS EN ARCHIVOS MD (DEBEN ELIMINARSE):" -ForegroundColor Red
$footers = Get-ChildItem -Path "." -Recurse -Include "*.md" | Select-String "<footer" | Select-Object -Unique Path
if ($footers) {
    foreach ($file in $footers) {
        Write-Host "  🔴 $($file.Path)" -ForegroundColor Red
    }
} else {
    Write-Host "  ✅ No hay footers en MD" -ForegroundColor Green
}

# 6. Resumen
Write-Host "`n📊 RESUMEN:" -ForegroundColor Cyan
$totalIssues = 0
if (-not (Test-Path "assets/css/main.css")) { $totalIssues++ }
if (-not (Test-Path "assets/css/estado.css")) { $totalIssues++ }
if ($footers) { $totalIssues += $footers.Count }
Write-Host "  Total de problemas detectados: $totalIssues" -ForegroundColor $(if ($totalIssues -eq 0) { "Green" } else { "Red" })