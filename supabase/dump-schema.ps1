# dump-schema.ps1
# Runs forever and refreshes schema.sql every 10 minutes

$DbUrl = $env:SUPABASE_DB_URL

if (-not $DbUrl) {
    Write-Host "SUPABASE_DB_URL is not set. Set it with:"
    Write-Host '  setx SUPABASE_DB_URL "postgres://postgres:...@db....supabase.co:5432/postgres"'
    exit 1
}

# Change this if your script is in a different folder
$ProjectPath = "D:\grc\grc-guard-main\supabase"
Set-Location $ProjectPath

while ($true) {
    Write-Host "[$(Get-Date)] Dumping schema..."
    supabase db dump --db-url "$DbUrl" --schema public --file schema.sql

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[$(Get-Date)] ✅ schema.sql updated."
    } else {
        Write-Host "[$(Get-Date)] ❌ dump failed."
    }

    # wait 10 minutes (600 seconds)
    Start-Sleep -Seconds 600
}
