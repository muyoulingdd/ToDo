$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$androidRoot = Join-Path $projectRoot 'android'
$javaHome = Join-Path $projectRoot '.local\android\jdk\jdk-21.0.11+10'
$sdkRoot = Join-Path $projectRoot '.local\android\sdk'

$env:JAVA_HOME = $javaHome
$env:ANDROID_SDK_ROOT = $sdkRoot

Push-Location $projectRoot
try {
  npm run android:sync
  Push-Location $androidRoot
  try {
    .\gradlew.bat assembleDebug
  }
  finally {
    Pop-Location
  }

  Copy-Item `
    -LiteralPath (Join-Path $androidRoot 'app\build\outputs\apk\debug\app-debug.apk') `
    -Destination (Join-Path $projectRoot 'ToDo.apk') `
    -Force
}
finally {
  Pop-Location
}
