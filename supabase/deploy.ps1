# Script per il deploy automatico di TUTTE le funzioni Supabase
# Questo script rileva automaticamente le cartelle in ./functions e le deploya
# disabilitando la verifica del JWT per permettere la comunicazione via SERVICE_ROLE.

$functionsPath = Join-Path $PSScriptRoot "functions"
$functions = Get-ChildItem -Path $functionsPath -Directory | Select-Object -ExpandProperty Name

Write-Host "🚀 Rilevate $($functions.Count) funzioni. Inizio Deploy (Safe Mode)..." -ForegroundColor Cyan

foreach ($fn in $functions) {
    Write-Host "📦 Deploying: $fn ..." -ForegroundColor Yellow
    supabase functions deploy $fn --no-verify-jwt
}

Write-Host "✅ Tutte le funzioni sono state deployate con successo!" -ForegroundColor Green
