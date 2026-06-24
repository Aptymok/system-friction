# Diagnose live local WorldSpect state.
# Requires npm run dev running on localhost:3000.

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "1) Current operational state BEFORE ingest" -ForegroundColor Cyan
Invoke-RestMethod "http://localhost:3000/api/worldspect/operational-state" |
  ConvertTo-Json -Depth 20

Write-Host ""
Write-Host "2) Running real adapter ingest" -ForegroundColor Cyan
Invoke-RestMethod "http://localhost:3000/api/cron/worldspect" -Method POST |
  ConvertTo-Json -Depth 20

Write-Host ""
Write-Host "3) Current operational state AFTER ingest" -ForegroundColor Cyan
Invoke-RestMethod "http://localhost:3000/api/worldspect/operational-state" |
  ConvertTo-Json -Depth 20
