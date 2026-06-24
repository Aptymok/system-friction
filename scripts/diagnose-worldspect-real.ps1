# Diagnose live local WorldSpect state.
# Requires npm run dev running on localhost:3000.

$ErrorActionPreference = "Stop"

function Show-Json($title, $value) {
  Write-Host ""
  Write-Host $title -ForegroundColor Cyan
  $value | ConvertTo-Json -Depth 30
}

$before = Invoke-RestMethod "http://localhost:3000/api/worldspect/operational-state"
Show-Json "1) Current operational state BEFORE ingest" $before

$ingest = Invoke-RestMethod "http://localhost:3000/api/cron/worldspect" -Method POST
Show-Json "2) Real adapter ingest result" $ingest

$after = Invoke-RestMethod "http://localhost:3000/api/worldspect/operational-state"
Show-Json "3) Current operational state AFTER ingest" $after

Write-Host ""
Write-Host "SUMMARY" -ForegroundColor Yellow
Write-Host ("status: " + $after.status)
Write-Host ("status_label: " + $after.status_label)
Write-Host ("decision_use: " + $after.decision_use)
Write-Host ("realInputCount: " + $after.source_mix.realInputCount)
Write-Host ("missingOrDegradedCount: " + $after.source_mix.missingOrDegradedCount)
Write-Host ("publicSourceCount: " + $after.source_mix.publicSourceCount)
Write-Host ("internalSourceCount: " + $after.source_mix.internalSourceCount)
Write-Host ("internalMissingCount: " + $after.source_mix.internalMissingCount)
Write-Host ("coverageDenominator: " + $after.source_mix.coverageDenominator)
Write-Host ("sourceCoverage: " + $after.source_mix.sourceCoverage)

if ($after.source_health) {
  Write-Host ""
  Write-Host "SOURCES" -ForegroundColor Yellow
  $after.source_health | ForEach-Object {
    Write-Host ("- " + $_.vector + " / " + $_.health + " / " + ($_.sources -join ","))
  }
}

