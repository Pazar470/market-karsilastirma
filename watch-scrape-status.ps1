# Tarama durumunu izle (scrape-status.txt). Taramayi YENIDEN BASLATMAZ.
# Kullanim: Proje kok dizininde calistir: .\watch-scrape-status.ps1
# Durdurmak icin Ctrl+C

$statusFile = Join-Path $PSScriptRoot "scrape-status.txt"
Write-Host "Tarama durumu izleniyor: $statusFile" -ForegroundColor Cyan
Write-Host "Guncelleme: her 2 saniye. Cikis: Ctrl+C`n" -ForegroundColor Gray

while ($true) {
    Clear-Host
    if (Test-Path $statusFile) {
        Get-Content $statusFile -Raw
    } else {
        Write-Host "scrape-status.txt henuz yok. Tam tarama baslatildi mi?" -ForegroundColor Yellow
        Write-Host "Proje kokunde: npx ts-node --esm scripts/monitored-scrape.ts"
    }
    Write-Host "`n[Son guncelleme: $(Get-Date -Format 'HH:mm:ss')]" -ForegroundColor DarkGray
    Start-Sleep -Seconds 2
}
