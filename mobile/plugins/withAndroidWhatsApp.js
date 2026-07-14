const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Permite o Android 11+ detectar o WhatsApp normal (com.whatsapp)
 * para abrir wa.me / whatsapp:// — não precisa de WhatsApp Business.
 */
function ensureChild(parent, name) {
  if (!parent[name]) parent[name] = [];
  return parent[name];
}

function withAndroidWhatsApp(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest.queries) {
      manifest.queries = [{}];
    }
    const queries = manifest.queries[0];

    const packages = ensureChild(queries, 'package');
    const hasWhatsApp = packages.some((p) => p.$?.['android:name'] === 'com.whatsapp');
    if (!hasWhatsApp) {
      packages.push({ $: { 'android:name': 'com.whatsapp' } });
    }
    const hasWhatsAppBusiness = packages.some(
      (p) => p.$?.['android:name'] === 'com.whatsapp.w4b'
    );
    if (!hasWhatsAppBusiness) {
      // opcional: se o usuário só tiver Business instalado, também funciona
      packages.push({ $: { 'android:name': 'com.whatsapp.w4b' } });
    }

    const intents = ensureChild(queries, 'intent');
    const hasWaMe = intents.some(
      (i) =>
        i.data?.[0]?.$?.['android:scheme'] === 'https' &&
        i.data?.[0]?.$?.['android:host'] === 'wa.me'
    );
    if (!hasWaMe) {
      intents.push({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        category: [{ $: { 'android:name': 'android.intent.category.BROWSABLE' } }],
        data: [{ $: { 'android:scheme': 'https', 'android:host': 'wa.me' } }],
      });
    }

    const hasWhatsAppScheme = intents.some(
      (i) => i.data?.[0]?.$?.['android:scheme'] === 'whatsapp'
    );
    if (!hasWhatsAppScheme) {
      intents.push({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        data: [{ $: { 'android:scheme': 'whatsapp' } }],
      });
    }

    return config;
  });
}

module.exports = withAndroidWhatsApp;
