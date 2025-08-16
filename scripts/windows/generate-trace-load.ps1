param(
  [string]$Target = "http://localhost:8004/demo/downstream",
  [int]$Qps = 5,
  [int]$DurationSeconds = 60,
  [int]$Concurrency = 4,
  [string]$DevicePrefix = "dev-load",
  [switch]$VerboseLogs
)

$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'

if ($Qps -lt 1) { $Qps = 1 }
if ($Concurrency -lt 1) { $Concurrency = 1 }
if ($DurationSeconds -lt 1) { $DurationSeconds = 1 }

Write-Host "Generating trace load -> Target=$Target QPS=$Qps Duration=${DurationSeconds}s Concurrency=$Concurrency" -ForegroundColor Cyan

$requestsTotal = $Qps * $DurationSeconds
$perWorker = [math]::Ceiling($requestsTotal / $Concurrency)
$delayMs = [math]::Max([int](1000.0 * $Concurrency / [double]$Qps), 1)

$jobs = @()
for ($w = 0; $w -lt $Concurrency; $w++) {
  $jobs += Start-Job -ScriptBlock {
    param($Target, $perWorker, $delayMs, $DevicePrefix, $VerboseLogs, $WorkerId)
    for ($i = 0; $i -lt $perWorker; $i++) {
      $dev = "$DevicePrefix-$WorkerId-$i"
      $url = "$Target?device_id=$dev"
      try {
        $resp = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 -Uri $url
        if ($VerboseLogs) { Write-Output $resp.Content }
      } catch {
        if ($VerboseLogs) { Write-Warning ("Request failed: " + $_) }
      }
      Start-Sleep -Milliseconds $delayMs
    }
  } -ArgumentList $Target, $perWorker, $delayMs, $DevicePrefix, $VerboseLogs.IsPresent, $w
}

Receive-Job -Job $jobs -Wait | Out-Null
Remove-Job -Job $jobs -Force | Out-Null

Write-Host "Done. Sent approx $requestsTotal requests." -ForegroundColor Green
