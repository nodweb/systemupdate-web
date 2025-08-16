param(
  [string]$Target = "http://localhost:8004/demo/downstream",
  [int]$Qps = 5,
  [int]$DurationSeconds = 60,
  [int]$Concurrency = 4,
  [string]$DevicePrefix = "dev-load",
  [ValidateSet('steady','burst','spike')][string]$Profile = 'steady',
  [double]$ErrorRate = 0.0,
  [switch]$VerboseLogs
)

$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'

if ($Qps -lt 1) { $Qps = 1 }
if ($Concurrency -lt 1) { $Concurrency = 1 }
if ($DurationSeconds -lt 1) { $DurationSeconds = 1 }
if ($ErrorRate -lt 0) { $ErrorRate = 0 } elseif ($ErrorRate -gt 1) { $ErrorRate = 1 }

Write-Host "Generating trace load -> Target=$Target QPS=$Qps Duration=${DurationSeconds}s Concurrency=$Concurrency Profile=$Profile ErrorRate=$ErrorRate" -ForegroundColor Cyan

$requestsTotal = $Qps * $DurationSeconds
$perWorker = [math]::Ceiling($requestsTotal / $Concurrency)

function Get-DelayMs($t, $baseDelay) {
  switch ($Profile) {
    'steady' { return $baseDelay }
    'burst'  {
      # every 5s: 2s burst (half delay), 3s calm (double delay)
      $phase = $t % 5
      if ($phase -lt 2) { return [int]([math]::Max($baseDelay / 2, 1)) } else { return [int]($baseDelay * 2) }
    }
    'spike'  {
      # first 80% steady, last 20% spike (quarter delay)
      if ($t -gt (0.8 * $DurationSeconds)) { return [int]([math]::Max($baseDelay / 4, 1)) } else { return $baseDelay }
    }
  }
}

function Maybe-ErrorUrl($url) {
  if ($ErrorRate -le 0) { return $url }
  $r = Get-Random -Minimum 0.0 -Maximum 1.0
  if ($r -le $ErrorRate) {
    # force a 404 to simulate errors; still traced by server
    if ($url.EndsWith('/')) { return "$url-does-not-exist" } else { return "$url/does-not-exist" }
  }
  return $url
}

$baseDelay = [math]::Max([int](1000.0 * $Concurrency / [double]$Qps), 1)

$jobs = @()
for ($w = 0; $w -lt $Concurrency; $w++) {
  $jobs += Start-Job -ScriptBlock {
    param($Target, $perWorker, $baseDelay, $DevicePrefix, $VerboseLogs, $WorkerId, $Profile, $DurationSeconds, $ErrorRate)
    function Get-DelayMs($t, $baseDelay, $Profile, $DurationSeconds) {
      switch ($Profile) {
        'steady' { return $baseDelay }
        'burst'  { $phase = $t % 5; if ($phase -lt 2) { return [int]([math]::Max($baseDelay / 2, 1)) } else { return [int]($baseDelay * 2) } }
        'spike'  { if ($t -gt (0.8 * $DurationSeconds)) { return [int]([math]::Max($baseDelay / 4, 1)) } else { return $baseDelay } }
      }
    }
    function Maybe-ErrorUrl($url, $ErrorRate) {
      if ($ErrorRate -le 0) { return $url }
      $r = Get-Random -Minimum 0.0 -Maximum 1.0
      if ($r -le $ErrorRate) { if ($url.EndsWith('/')) { return "$url-does-not-exist" } else { return "$url/does-not-exist" } }
      return $url
    }
    $start = Get-Date
    for ($i = 0; $i -lt $perWorker; $i++) {
      $dev = "$DevicePrefix-$WorkerId-$i"
      $url = "$Target?device_id=$dev"
      $url = Maybe-ErrorUrl $url $ErrorRate
      try {
        $resp = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 -Uri $url
        if ($VerboseLogs) { Write-Output $resp.Content }
      } catch {
        if ($VerboseLogs) { Write-Warning ("Request failed: " + $_) }
      }
      $elapsed = (Get-Date) - $start
      $t = [int]$elapsed.TotalSeconds
      $delayMs = Get-DelayMs $t $baseDelay $Profile $DurationSeconds
      Start-Sleep -Milliseconds $delayMs
    }
  } -ArgumentList $Target, $perWorker, $baseDelay, $DevicePrefix, $VerboseLogs.IsPresent, $w, $Profile, $DurationSeconds, $ErrorRate
}

Receive-Job -Job $jobs -Wait | Out-Null
Remove-Job -Job $jobs -Force | Out-Null

Write-Host "Done. Sent approx $requestsTotal requests." -ForegroundColor Green
