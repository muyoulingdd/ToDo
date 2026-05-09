param(
  [string]$Owner = 'muyoulingdd',
  [string]$Repo = 'ToDo',
  [string]$Tag = 'v1.1.0',
  [string]$ApkName = 'ToDo.apk',
  [string]$LocalApkPath = '.\ToDo.apk'
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$aaptPath = Join-Path $projectRoot '.local\android\sdk\build-tools\36.1.0\aapt.exe'

if (-not (Test-Path $aaptPath)) {
  throw "aapt not found: $aaptPath"
}

$resolvedLocalApkPath = Join-Path $projectRoot $LocalApkPath
if (-not (Test-Path $resolvedLocalApkPath)) {
  throw "Local APK not found: $resolvedLocalApkPath"
}

$downloadUrl = "https://github.com/$Owner/$Repo/releases/download/$Tag/$ApkName"
$tempApkPath = Join-Path $env:TEMP "$Repo-$Tag-$ApkName"

Invoke-WebRequest -UseBasicParsing $downloadUrl -OutFile $tempApkPath

function Get-ApkInfo {
  param(
    [string]$AaptPath,
    [string]$ApkPath
  )

  $badging = & $AaptPath dump badging $ApkPath
  $packageLine = $badging | Select-String "^package: "
  if (-not $packageLine) {
    throw "Unable to read package info from APK: $ApkPath"
  }

  $packageText = $packageLine.ToString()
  $versionCode = ([regex]::Match($packageText, "versionCode='([^']+)'")).Groups[1].Value
  $versionName = ([regex]::Match($packageText, "versionName='([^']+)'")).Groups[1].Value
  $packageName = ([regex]::Match($packageText, "name='([^']+)'")).Groups[1].Value
  $hash = (Get-FileHash -Algorithm SHA256 $ApkPath).Hash
  $size = (Get-Item $ApkPath).Length

  [PSCustomObject]@{
    Path = $ApkPath
    PackageName = $packageName
    VersionCode = $versionCode
    VersionName = $versionName
    Sha256 = $hash
    Size = $size
  }
}

$localInfo = Get-ApkInfo -AaptPath $aaptPath -ApkPath $resolvedLocalApkPath
$remoteInfo = Get-ApkInfo -AaptPath $aaptPath -ApkPath $tempApkPath

$sameVersion = $localInfo.VersionCode -eq $remoteInfo.VersionCode -and $localInfo.VersionName -eq $remoteInfo.VersionName
$sameHash = $localInfo.Sha256 -eq $remoteInfo.Sha256
$samePackage = $localInfo.PackageName -eq $remoteInfo.PackageName

Write-Host "Local APK"
$localInfo | Format-List
Write-Host ""
Write-Host "Release APK"
$remoteInfo | Format-List
Write-Host ""

if ($sameVersion -and $sameHash -and $samePackage) {
  Write-Host "Release APK matches local APK." -ForegroundColor Green
  exit 0
}

Write-Host "Release APK does not match local APK." -ForegroundColor Red
if (-not $samePackage) {
  Write-Host "Package name mismatch." -ForegroundColor Yellow
}
if (-not $sameVersion) {
  Write-Host "Version mismatch." -ForegroundColor Yellow
}
if (-not $sameHash) {
  Write-Host "SHA-256 mismatch." -ForegroundColor Yellow
}

exit 1
