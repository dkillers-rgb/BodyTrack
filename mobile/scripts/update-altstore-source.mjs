/**
 * Atualiza mobile/altstore/source.json a partir de app.json e source.config.json.
 *
 * Uso:
 *   node scripts/update-altstore-source.mjs
 *   node scripts/update-altstore-source.mjs --download-url https://.../BodyTrack.ipa --size 45000000 --build 2
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, '..');
const appJsonPath = path.join(mobileRoot, 'app.json');
const configPath = path.join(mobileRoot, 'altstore', 'source.config.json');
const outputPath = path.join(mobileRoot, 'altstore', 'source.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2);
    const value = argv[i + 1];
    if (value && !value.startsWith('--')) {
      args[name] = value;
      i += 1;
    } else {
      args[name] = true;
    }
  }
  return args;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildSource(appJson, config, args) {
  const expo = appJson.expo;
  const version = expo.version;
  const buildVersion = args.build || '1';
  const cameraDescription =
    expo.ios?.infoPlist?.NSCameraUsageDescription ||
    'O BodyTrack precisa da câmera para ler QR Codes dos relatórios de análise corporal.';

  const downloadURL = args['download-url'] || config.latestVersion.downloadURL;
  const size = Number(args.size || config.latestVersion.size || 0);
  const versionDescription =
    args.description || config.latestVersion.localizedDescription || `BodyTrack ${version}`;

  if (!downloadURL || downloadURL.includes('SEU_USUARIO')) {
    console.warn('Aviso: defina downloadURL em source.config.json ou passe --download-url.');
  }

  const source = {
    name: config.source.name,
    subtitle: config.source.subtitle,
    description: config.source.description,
    iconURL: config.source.iconURL,
    website: config.source.website || undefined,
    tintColor: config.source.tintColor,
    featuredApps: [config.app.bundleIdentifier],
    apps: [
      {
        name: config.app.name,
        bundleIdentifier: config.app.bundleIdentifier,
        developerName: config.app.developerName,
        subtitle: config.app.subtitle,
        localizedDescription: config.app.localizedDescription,
        iconURL: config.app.iconURL,
        tintColor: config.app.tintColor,
        category: config.app.category,
        appPermissions: {
          entitlements: [],
          privacy: {
            NSCameraUsageDescription: cameraDescription,
          },
        },
        versions: [
          {
            version,
            buildVersion: String(buildVersion),
            date: todayIsoDate(),
            localizedDescription: versionDescription,
            downloadURL,
            size,
            minOSVersion: config.app.minOSVersion,
          },
        ],
      },
    ],
    news: [],
  };

  if (!source.website) delete source.website;

  return source;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const appJson = readJson(appJsonPath);
  const config = readJson(configPath);
  const source = buildSource(appJson, config, args);

  fs.writeFileSync(outputPath, `${JSON.stringify(source, null, 2)}\n`, 'utf8');

  const iconSrc = path.join(mobileRoot, 'assets', 'icon.png');
  const iconDst = path.join(mobileRoot, 'altstore', 'icon.png');
  if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, iconDst);
    console.log('Ícone copiado para altstore/icon.png');
  }

  console.log('AltStore source gerado:');
  console.log(outputPath);
  console.log('');
  console.log('Próximos passos:');
  console.log('1. Edite altstore/source.config.json com suas URLs HTTPS reais.');
  console.log('2. Hospede source.json + icon.png + IPA (ex.: GitHub Pages / Releases).');
  console.log('3. No AltStore: Sources → Add Source → URL do source.json');
}

main();
