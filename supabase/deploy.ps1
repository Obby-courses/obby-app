# Script per il deploy sicuro delle funzioni Supabase
# Questo script garantisce che tutte le funzioni siano caricate DISABILITANDO la verifica del JWT
# in modo che possano comunicare tra loro tramite SERVICE_ROLE.

$functions = @(
    "create-macrophases",
    "create-phases",
    "create-steps",
    "generate-resources-for-steps",
    "search-resources"
)

Write-Host "🚀 Inizio Deploy Funzioni Supabase (Safe Mode)..." -ForegroundColor Cyan

foreach ($fn in $functions) {
    Write-Host "📦 Deploying: $fn ..." -ForegroundColor Yellow
    supabase functions deploy $fn --no-verify-jwt
}

Write-Host "✅ Deploy completato con successo!" -ForegroundColor Green
