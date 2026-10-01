$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
$runtimeDir = Join-Path $projectRoot 'runtime'
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$env:TEMP = Join-Path $runtimeDir 'temp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
if ($env:OS -eq 'Windows_NT') {
  $localIdentity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  & icacls.exe $runtimeDir /inheritance:r /grant:r "$($localIdentity):(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo restringir el acceso a runtime.' }
}
& node backend/server.js
