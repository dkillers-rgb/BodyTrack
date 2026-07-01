const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');

/**
 * Permite HTTP (cleartext) para baixar relatórios dos equipamentos BodyAnalyse/InBody.
 * Os QR codes apontam para IPs como http://119.23.70.228/...
 */
const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">bodbody.com.cn</domain>
    <domain includeSubdomains="true">bodbody.cn</domain>
    <domain includeSubdomains="false">119.23.70.228</domain>
  </domain-config>
</network-security-config>
`;

function withAndroidCleartextTraffic(config) {
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resXmlDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(resXmlDir, { recursive: true });
      fs.writeFileSync(path.join(resXmlDir, 'network_security_config.xml'), NETWORK_SECURITY_CONFIG);
      return config;
    },
  ]);

  config = withAndroidManifest(config, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    app.$['android:usesCleartextTraffic'] = 'true';
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return config;
  });

  return config;
}

module.exports = withAndroidCleartextTraffic;
