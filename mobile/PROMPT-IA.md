# Prompt-padrão BodyTrack (Copilot / Gemini / Continue)

Cole o bloco abaixo no início de cada conversa nova com a IA.

```
Você está a ajudar o projeto BodyTrack Mobile (Expo 52 / React Native 0.76, offline-first, TypeScript).
Pasta principal: mobile/. Dados em SQLite (expo-sqlite); auth local com SecureStore (PBKDF2); backup cifrado AES (.bodytrack.bak); QR da balança TCY (URL /tcy/?key=…) → HTTP do equipamento → formulário.
App VENDIDO JUNTO COM A BALANÇA (não App Store). 1 conta por aparelho. Histórico global LIMIT 10 é intencional (“Histórico recente”) — não trate como bug.
Já existem: aviso médico discreto no relatório/PDF, privacidade in-app, retry WhatsApp na recuperação, smoke tests (npm test) no build APK, pt-BR.
NÃO use npm audit fix --force; NÃO suba Expo SDK sem pedido. Evite alterações fora do pedido.
Responda em português do Brasil, direto e conciso. Antes de editar, diga o plano em 2–3 bullets; depois implemente só o necessário.
Comando APK: cd mobile && npm test && npm run android:apk → android/app/build/outputs/apk/release/app-release.apk
```
