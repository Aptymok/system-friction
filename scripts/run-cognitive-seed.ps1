Write-Host "SFI Cognitive Seed"

npm run tsx scripts/bootstrap-sfi-cognitive-seed.ts

if ($LASTEXITCODE -eq 0) {

    Write-Host ""
    Write-Host "Seed completed successfully"

}
else {

    Write-Host ""
    Write-Host "Seed failed"

    exit 1

}