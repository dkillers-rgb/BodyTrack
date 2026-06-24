# Build Android para tablet com Android 7.0 (SDK 24)

## 1. Pré-requisitos

Certifique-se de ter instalado:

- Node.js 18+ e npm
- Expo CLI
- JDK 17 (recomendado)
- Android SDK com plataforma Android 24 e ferramentas de build
- Um tablet com Android 7.0 ou superior

> No Windows, o `winget` pode ajudar na instalação de alguns itens.

---

## 2. Instalar o JDK 17

1. Abra um terminal PowerShell.
2. Instale o JDK 17 via winget:

```powershell
winget install --id Microsoft.OpenJDK.17 -e --accept-package-agreements --accept-source-agreements
```

3. Configure o `JAVA_HOME` no PowerShell (para essa sessão):

```powershell
$env:JAVA_HOME = 'C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
```

4. Verifique a instalação:

```powershell
java -version
javac -version
```

---

## 3. Instalar o Android SDK

### 3.1. Usando Android Studio (recomendado)

1. Baixe e instale o Android Studio: https://developer.android.com/studio
2. Abra o Android Studio e vá em `SDK Manager`.
3. Instale:
   - Android SDK Platform 24
   - Android SDK Platform-Tools
   - Android SDK Build-Tools (compatível com a sua versão do Gradle; ex: 35.0.0)
   - Android SDK Tools (se disponível)

### 3.2. Alternativa: usando `sdkmanager`

Se você já possui `sdkmanager`, instale:

```powershell
sdkmanager "platform-tools" "platforms;android-24" "build-tools;35.0.0"
```

---

## 4. Configurar `ANDROID_HOME` e `local.properties`

### 4.1. Definir `ANDROID_HOME`

No PowerShell:

```powershell
$env:ANDROID_HOME = 'C:\Users\SeuNome\AppData\Local\Android\Sdk'
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools\bin;$env:PATH"
```

### 4.2. Criar `local.properties`

No diretório do projeto Android (`mobile/android`), crie o arquivo `local.properties` com:

```properties
sdk.dir=C:\Users\SeuNome\AppData\Local\Android\Sdk
```

> Substitua `SeuNome` pelo seu usuário do Windows.

---

## 5. Validar o projeto Expo e Android

1. No diretório `mobile`, execute:

```powershell
npx expo prebuild --platform android --no-install
```

2. Confirme que o arquivo `mobile/android/build.gradle` usa `minSdkVersion 24`.

---

## 6. Gerar o APK de release

1. No terminal com `JAVA_HOME` e `ANDROID_HOME` configurados, vá para:

```powershell
cd c:\Users\Uiry Monteiro\Documents\Projeto\BodyTrack\mobile\android
```

2. Execute o build:

```powershell
.\gradlew.bat clean assembleRelease
```

3. O APK de release deve aparecer em:

```text
mobile\android\app\build\outputs\apk\release\app-release.apk
```

---

## 7. Instalar no tablet Android

1. Ative `Depuração USB` no tablet.
2. Conecte o tablet ao PC via USB.
3. No terminal, confirme o dispositivo:

```powershell
adb devices
```

4. Instale o APK:

```powershell
adb install -r mobile\android\app\build\outputs\apk\release\app-release.apk
```

5. Abra o app no tablet.

---

## 8. Observações

- Se o build falhar em `expo-modules-core` ou `SDK location not found`, verifique `local.properties` e as variáveis de ambiente.
- Se o tablet não aceitar a instalação, habilite `Instalar apps de fontes desconhecidas`.
- O app suporta `minSdkVersion 24`, então Android 7.0 deve ser compatível.
