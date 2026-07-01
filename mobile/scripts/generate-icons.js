const fs = require('fs');
const path = require('path');

async function main() {
  const sharp = require('sharp');
  const assetsDir = path.join(__dirname, '..', 'assets');
  const sourcePath = path.join(assetsDir, 'icon-source.png');

  if (!fs.existsSync(sourcePath)) {
    throw new Error('Arquivo icon-source.png não encontrado em assets/');
  }

  const iconOut = path.join(assetsDir, 'icon.png');
  const adaptiveOut = path.join(assetsDir, 'adaptive-icon.png');

  await sharp(sourcePath)
    .resize(1024, 1024, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(iconOut);

  await sharp(sourcePath)
    .resize(1024, 1024, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(adaptiveOut);

  console.log('Ícones gerados a partir de icon-source.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
