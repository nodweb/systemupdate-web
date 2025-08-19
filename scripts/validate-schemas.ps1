param(
  [string]$PythonExe = "python"
)

$ErrorActionPreference = "Stop"

Write-Host "Validating schemas (Avro + JSON)..." -ForegroundColor Cyan
& $PythonExe scripts/schema_validate.py
if ($LASTEXITCODE -ne 0) {
  Write-Error "Schema validation failed with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}

Write-Host "Schemas valid." -ForegroundColor Green
