# Test OPA policies

$opaUrl = "http://localhost:8181/v1"

# Wait for OPA to be ready
$maxRetries = 30
$retryCount = 0
$opaReady = $false

Write-Host "Waiting for OPA to be ready..."
while (-not $opaReady -and $retryCount -lt $maxRetries) {
    try {
        $health = Invoke-RestMethod -Uri "${opaUrl}/health" -Method Get -ErrorAction Stop
        if ($health.healthy -eq $true) {
            $opaReady = $true
            Write-Host "OPA is ready!" -ForegroundColor Green
        }
    } catch {
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 1
        $retryCount++
    }
}

if (-not $opaReady) {
    Write-Error "Timed out waiting for OPA to start"
    exit 1
}

# Load policies
Write-Host "Loading OPA policies..."
$policyFiles = Get-ChildItem -Path "./opa/policies" -Filter "*.rego"

foreach ($file in $policyFiles) {
    if ($file.Name -like "*_test.rego") {
        continue
    }
    
    Write-Host "Loading policy: $($file.Name)"
    $policyName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    $policyContent = Get-Content -Path $file.FullName -Raw
    
    $body = @{
        policy = $policyContent
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "${opaUrl}/policies/${policyName}" -Method Put -Body $body -ContentType "application/json"
        Write-Host "  ✓ Policy loaded successfully" -ForegroundColor Green
    } catch {
        Write-Error "  ✗ Failed to load policy: $_"
        exit 1
    }
}

# Run tests
Write-Host "`nRunning OPA tests..."
$testFiles = Get-ChildItem -Path "./opa/policies" -Filter "*_test.rego"

foreach ($file in $testFiles) {
    Write-Host "Running tests in: $($file.Name)"
    $testContent = Get-Content -Path $file.FullName -Raw
    
    try {
        $response = Invoke-RestMethod -Uri "${opaUrl}/test" -Method Post -Body $testContent -ContentType "text/plain"
        
        if ($response.result) {
            $passed = $response.result | Where-Object { $_.result -eq $true } | Measure-Object | Select-Object -ExpandProperty Count
            $failed = $response.result | Where-Object { $_.result -ne $true } | Measure-Object | Select-Object -ExpandProperty Count
            
            if ($failed -gt 0) {
                Write-Host "  ✗ Tests failed: $passed passed, $failed failed" -ForegroundColor Red
                $response.result | Where-Object { $_.result -ne $true } | ForEach-Object {
                    Write-Host "    - $($_.name): $($_.error)" -ForegroundColor Red
                }
                exit 1
            } else {
                Write-Host "  ✓ All $passed tests passed" -ForegroundColor Green
            }
        } else {
            Write-Host "  ✓ No tests found" -ForegroundColor Yellow
        }
    } catch {
        Write-Error "  ✗ Test execution failed: $_"
        exit 1
    }
}

Write-Host "`nAll tests completed successfully!" -ForegroundColor Green
