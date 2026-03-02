# Script per il deploy automatico di TUTTE le funzioni Supabase
# Include il supporto per: generate-skeleton, search-web-resource, create-steps, search-resources, ecc.
# Questo script rileva automaticamente le cartelle in ./functions e le deploya.

$functionsPath = Join-Path $PSScriptRoot "functions"
$functions = Get-ChildItem -Path $functionsPath -Directory | Select-Object -ExpandProperty Name | Sort-Object

Write-Host "Rilevate $($functions.Count) funzioni. Inizio Deploy (Safe Mode via npx)..." -ForegroundColor Cyan

foreach ($fn in $functions) {
    Write-Host "-------------------------------------------" -ForegroundColor Gray
    Write-Host "🚀 Deploying: $fn ..." -ForegroundColor Yellow
    
    # Usiamo npx per garantire l'uso della versione corretta della CLI
    npx supabase functions deploy $fn --no-verify-jwt
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $fn deployata con successo!" -ForegroundColor Green
    } else {
        Write-Host "❌ Errore durante il deploy di $fn" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Tutte le operazioni di deploy sono terminate!" -ForegroundColor Cyan
