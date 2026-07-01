$ErrorActionPreference = "Stop"

$MobileRoot = Split-Path $PSScriptRoot -Parent
$AndroidRoot = Join-Path $MobileRoot "android"
$ApkRelease = Join-Path $AndroidRoot "app\build\outputs\apk\release\app-release.apk"
$ApkDebug = Join-Path $AndroidRoot "app\build\outputs\apk\debug\app-debug.apk"

if (-not $env:ANDROID_HOME) {
  $defaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
  if (Test-Path $defaultSdk) {
    $env:ANDROID_HOME = $defaultSdk
    $env:ANDROID_SDK_ROOT = $defaultSdk
  }
}

if (-not $env:ANDROID_HOME) {
  throw "ANDROID_HOME nao encontrado. Instale o Android SDK ou defina ANDROID_HOME."
}

if (-not $env:GRADLE_USER_HOME) {
  $env:GRADLE_USER_HOME = "C:\gradle"
}

$env:NODE_ENV = "production"

Set-Location $MobileRoot

Write-Host ">> Instalando dependencias npm do app mobile..."
Set-Location $MobileRoot
npm install

if (-not (Test-Path $AndroidRoot)) {
  Write-Host ">> Gerando pasta android (expo prebuild)..."
  npx expo prebuild --platform android --no-install
}

Write-Host ">> Compilando APK release..."
Set-Location $AndroidRoot
.\gradlew.bat assembleRelease --no-daemon
$releaseExit = $LASTEXITCODE

if ($releaseExit -ne 0) {
  throw "Build release falhou (exit code $releaseExit). Corrija os erros acima e tente novamente."
}

if (Test-Path $ApkRelease) {
  Write-Host ""
  Write-Host "APK gerado com sucesso:"
  Write-Host $ApkRelease
} elseif (Test-Path $ApkDebug) {
  Write-Host ""
  Write-Host "APK debug gerado:"
  Write-Host $ApkDebug
} else {
  throw "Build terminou, mas o APK nao foi encontrado."
}
