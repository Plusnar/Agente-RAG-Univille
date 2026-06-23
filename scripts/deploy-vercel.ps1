$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host ">> Sincronizando variaveis do .env com a Vercel..." -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Write-Error "Arquivo .env nao encontrado. Copie .env.example para .env e preencha as chaves."
}

if (-not (Test-Path ".vercel\project.json")) {
    Write-Host ">> Vinculando projeto na Vercel..." -ForegroundColor Cyan
    npx vercel link --yes --scope plusnar
}

$envNames = @(
    "EMBEDDING_PROVIDER",
    "LLM_PROVIDER",
    "COHERE_API_KEY",
    "OPENAI_API_KEY",
    "COHERE_EMBED_MODEL",
    "OPENAI_EMBED_MODEL",
    "COHERE_CHAT_MODEL",
    "OPENAI_CHAT_MODEL",
    "CHROMA_COLLECTION",
    "RETRIEVER_K",
    "USE_COHERE_RERANK",
    "COHERE_RERANK_MODEL",
    "MIN_RERANK_SCORE"
)

$lines = Get-Content ".env" | Where-Object { $_ -and $_ -notmatch "^\s*#" }

foreach ($line in $lines) {
    if ($line -notmatch "^([^=]+)=(.*)$") { continue }
    $name = $matches[1].Trim()
    $value = $matches[2].Trim()
    if ($envNames -notcontains $name) { continue }
    if (-not $value) { continue }

    foreach ($target in @("production")) {
        $value | npx vercel env add $name $target --force 2>$null
    }
    Write-Host "   + $name" -ForegroundColor DarkGray
}

Write-Host ">> Fazendo deploy (producao)..." -ForegroundColor Cyan
npx vercel --prod --yes

Write-Host ""
Write-Host "Deploy concluido! A URL aparece acima." -ForegroundColor Green
