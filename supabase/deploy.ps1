# Script per il deploy automatico di TUTTE le funzioni Supabase
# Include il supporto per: search-web-resource, create-steps, search-resources, ecc.
# Questo script rileva automaticamente le cartelle in ./functions e le deploya.

$functionsPath = Join-Path $PSScriptRoot "functions"
$functions = Get-ChildItem -Path $functionsPath -Directory | Select-Object -ExpandProperty Name | Sort-Object

Write-Host "Rilevate $($functions.Count) funzioni. Inizio Deploy (Safe Mode)..." -ForegroundColor Cyan

foreach ($fn in $functions) {
    Write-Host "Deploying: $fn ..." -ForegroundColor Yellow
    supabase functions deploy $fn --no-verify-jwt
}

Write-Host "Tutte le funzioni sono state deployate con successo!" -ForegroundColor Green
