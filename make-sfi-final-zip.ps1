param(
  [string]$Root = (Get-Location).Path,
  [string]$OutputDir = "",
  [switch]$IncludeGit,
  [switch]$IncludeCleanroom,
  [switch]$IncludeExports
)

$ErrorActionPreference = "Stop"

function Normalize-PathText([string]$PathText) {
  return ($PathText -replace '/', '\').TrimEnd('\')
}

$Root = Normalize-PathText((Resolve-Path -LiteralPath $Root).Path)

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $OutputDir = Join-Path $Root "_sfi_exports"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ZipPath = Join-Path $OutputDir "system-friction-final-$Stamp.zip"
$ManifestPath = Join-Path $OutputDir "system-friction-final-$Stamp.manifest.txt"
$ReportPath = Join-Path $OutputDir "system-friction-final-$Stamp.report.md"
$Stage = Join-Path $env:TEMP "sfi_zip_stage_$Stamp"

if (Test-Path -LiteralPath $Stage) {
  Remove-Item -LiteralPath $Stage -Recurse -Force -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Force -Path $Stage | Out-Null

Write-Host ""
Write-Host "SFI FINAL ZIP PACKAGER - PS 5.1 COMPATIBLE"
Write-Host "Root: $Root"
Write-Host "Output: $ZipPath"
Write-Host ""

$ExcludedRootDirs = @(
  "node_modules",
  ".next",
  ".turbo",
  ".vercel",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  ".parcel-cache",
  "dist",
  "build",
  "coverage",
  "htmlcov"
)

if (-not $IncludeGit) { $ExcludedRootDirs += ".git" }
if (-not $IncludeCleanroom) { $ExcludedRootDirs += "_sfi_cleanroom" }
if (-not $IncludeExports) { $ExcludedRootDirs += "_sfi_exports" }

$ExcludedFileNames = @(
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.test",
  ".env.preview",
  ".DS_Store",
  "Thumbs.db",
  "npm-debug.log",
  "yarn-debug.log",
  "yarn-error.log",
  "pnpm-debug.log",
  "make-sfi-final-zip.ps1"
)

$ExcludedExtensions = @(
  ".log",
  ".tmp",
  ".bak",
  ".pyc",
  ".pyo",
  ".tsbuildinfo"
)

function Get-RelativePathCompat([string]$FullPath) {
  $normalizedFull = Normalize-PathText($FullPath)
  if ($normalizedFull.Length -lt $Root.Length) { return "" }
  $relative = $normalizedFull.Substring($Root.Length)
  $relative = $relative.TrimStart('\')
  return $relative
}

function Is-ExcludedRelative([string]$RelativePath, [bool]$IsDirectory, [string]$Name) {
  if ([string]::IsNullOrWhiteSpace($RelativePath)) { return $false }

  $parts = $RelativePath -split '\\'
  $first = $parts[0]

  if ($ExcludedRootDirs -contains $first) { return $true }
  if ($ExcludedFileNames -contains $Name) { return $true }

  foreach ($ext in $ExcludedExtensions) {
    if ($Name.EndsWith($ext, [System.StringComparison]::OrdinalIgnoreCase)) {
      return $true
    }
  }

  if ($Name -like ".env.*" -and $Name -ne ".env.example") {
    return $true
  }

  if ($RelativePath -match "\\__pycache__\\") { return $true }
  if ($RelativePath -match "\\node_modules\\") { return $true }
  if ($RelativePath -match "\\\.next\\") { return $true }
  if ($RelativePath -match "\\\.venv\\") { return $true }
  if ($RelativePath -match "\\venv\\") { return $true }

  return $false
}

$AllFiles = Get-ChildItem -LiteralPath $Root -Recurse -Force -File -ErrorAction SilentlyContinue
$Included = New-Object System.Collections.Generic.List[string]
$Excluded = New-Object System.Collections.Generic.List[string]

foreach ($file in $AllFiles) {
  $rel = Get-RelativePathCompat $file.FullName

  if (Is-ExcludedRelative $rel $false $file.Name) {
    $Excluded.Add($rel)
    continue
  }

  $dest = Join-Path $Stage $rel
  $destDir = Split-Path -Parent $dest
  if (!(Test-Path -LiteralPath $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  }

  Copy-Item -LiteralPath $file.FullName -Destination $dest -Force
  $Included.Add($rel)
}

if (Test-Path -LiteralPath $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}

Compress-Archive -Path (Join-Path $Stage "*") -DestinationPath $ZipPath -Force

$Included | Sort-Object | Set-Content -LiteralPath $ManifestPath -Encoding UTF8

$zipItem = Get-Item -LiteralPath $ZipPath
$includedCount = $Included.Count
$excludedCount = $Excluded.Count
$sizeMb = "{0:N2}" -f ($zipItem.Length / 1MB)

@(
  "# SFI FINAL ZIP REPORT",
  "",
  "Generated: $Stamp",
  "Root: $Root",
  "Zip: $ZipPath",
  "Manifest: $ManifestPath",
  "",
  "## Result",
  "- Included files: $includedCount",
  "- Excluded files: $excludedCount",
  "- Zip size: $sizeMb MB",
  "",
  "## Excluded by default",
  "- .env / .env.local / .env.production / .env.* except .env.example",
  "- .git unless -IncludeGit is used",
  "- node_modules",
  "- .next",
  "- .venv / venv",
  "- _sfi_cleanroom unless -IncludeCleanroom is used",
  "- _sfi_exports unless -IncludeExports is used",
  "- caches, logs, build folders, coverage folders",
  "",
  "## Integrity",
  "This ZIP is intended as a clean source/export package, not as an installed runtime image.",
  "Run npm install or npm ci after extracting if dependencies are needed."
) | Set-Content -LiteralPath $ReportPath -Encoding UTF8

Remove-Item -LiteralPath $Stage -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "SFI FINAL ZIP CREATED"
Write-Host "ZIP: $ZipPath"
Write-Host "MANIFEST: $ManifestPath"
Write-Host "REPORT: $ReportPath"
Write-Host ""
