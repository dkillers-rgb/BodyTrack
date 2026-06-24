# Manual APK Build Guide - BodyTrack for Android Tablet

## Problema Identificado
O ambiente não tem o Android SDK ou JDK configurados corretamente no PATH, mesmo após instalar via winget.

## Solução Manual - Passo a Passo

### Passo 1: Instalar e Configurar JDK 17
```powershell
# Se Java ainda não está acessível, execute:
winget install Microsoft.OpenJDK.17
```

**Após instalar:**
- Localize o caminho de instalação do JDK:
  - Procure em: `C:\Program Files\Eclipse Adoptium\jdk-17.*` ou similar
  - Copie o caminho completo

- Configure a variável de ambiente JAVA_HOME:
  1. Pressione `Win + X` → "Configurações do Sistema" → "Variáveis de ambiente"
  2. Clique em "Variáveis de ambiente"
  3. Clique em "Nova..." (Variáveis do usuário)
  4. Nome: `JAVA_HOME`
  5. Valor: Caminho completo do JDK (ex: `C:\Program Files\Eclipse Adoptium\jdk-17.0.11.9_1`)
  6. Clique OK e reinicie o terminal/PowerShell

### Passo 2: Instalar Android Studio ou Android SDK
```powershell
# Android Studio já foi baixado. Se ainda não foi executado:
winget install Google.AndroidStudio
```

**Após instalar Android Studio:**
1. Abra o Android Studio
2. Na primeira execução, ele oferecerá instalar Android SDK automaticamente
3. Escolha instalar componentes padrão

### Passo 3: Configurar ANDROID_HOME
- O SDK será instalado em: `C:\Users\[seu_usuário]\AppData\Local\Android\sdk`
- Configure a variável de ambiente `ANDROID_HOME`:
  1. Win + X → Variáveis de ambiente
  2. Nova Variável: `ANDROID_HOME`
  3. Valor: `C:\Users\Uiry Monteiro\AppData\Local\Android\sdk`

### Passo 4: Adicionar ferramentas ao PATH
- Crie estas variáveis de ambiente (ou adicione ao PATH existente):
  - `%ANDROID_HOME%\tools\bin`
  - `%ANDROID_HOME%\platform-tools`
  - `%ANDROID_HOME%\emulator`

### Passo 5: Verificar instalação
```powershell
# Reinicie o PowerShell após configurar as variáveis, depois execute:
java -version
sdkmanager --version
adb --version
```

### Passo 6: Instalar componentes Android necessários
```powershell
# Instale a API nível 24 (minSDK) e ferramentas de build:
sdkmanager "build-tools;34.0.0" "platforms;android-34" "platform-tools"
```

### Passo 7: Gerar APK
```powershell
cd C:\Users\Uiry Monteiro\Documents\Projeto\BodyTrack\mobile

# Usar Expo CLI para gerar APK (se EAS Build não estiver configurado):
npx eas build --platform android --local

# OU usar Gradle diretamente:
cd android
gradlew.bat clean assembleRelease
```

O APK será gerado em:
```
C:\Users\Uiry Monteiro\Documents\Projeto\BodyTrack\mobile\android\app\build\outputs\apk\release\app-release.apk
```

### Passo 8: Instalar em tablet Android
```powershell
# Conecte o tablet via USB, depois:
adb devices  # Verifica dispositivos conectados
adb install C:\Users\Uiry Monteiro\Documents\Projeto\BodyTrack\mobile\android\app\build\outputs\apk\release\app-release.apk
```

---

## Alternativa: Usar EAS Build (Recomendado)
Se a configuração local for complexa, use o serviço de build da Expo na nuvem:

```powershell
cd C:\Users\Uiry Monteiro\Documents\Projeto\BodyTrack\mobile

# Faça login na Expo (se não tiver conta, crie uma em https://expo.dev)
npx eas login

# Inicie o build na nuvem (Expo faz tudo):
npx eas build --platform android
```

O APK será enviado para seu email após a compilação.

---

## Troubleshooting

### "Java não encontrado"
- Confirme que `JAVA_HOME` foi configurado
- Reinicie o terminal após configurar as variáveis
- Verifique com: `echo %JAVA_HOME%`

### "SDK location not found"
- Edite `mobile/android/local.properties`:
  ```
  sdk.dir=C:\Users\Uiry Monteiro\AppData\Local\Android\sdk
  ```

### "gradle wrapper error"
- Certifique-se de que Gradle está em `mobile/android/gradlew.bat`
- Se ausente, regenere com Expo: `npx expo prebuild --clean`

---

## Contato & Debug
Após configurar, execute para confirmar tudo está pronto:
```powershell
$env:JAVA_HOME
$env:ANDROID_HOME
$env:Path -split ';' | Select-String "Android|JDK|Java"
```
