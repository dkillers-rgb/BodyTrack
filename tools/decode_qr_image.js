const path = require('path');
const { Jimp } = require('jimp');
const jsQR = require('jsqr');

const imagePath =
  process.argv[2] ||
  path.join(
    __dirname,
    '../assets/c__Users_Uiry_Monteiro_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_WhatsApp_Image_2026-06-23_at_13.51.54__1_-c495b804-a5dd-4b08-9164-dbdbd2981df4.png'
  );

async function main() {
  const image = await Jimp.read(imagePath);
  const { width, height, data } = image.bitmap;

  // Try full image and center crop (QR modal is centered)
  const regions = [
    { x: 0, y: 0, w: width, h: height },
    { x: Math.floor(width * 0.15), y: Math.floor(height * 0.2), w: Math.floor(width * 0.7), h: Math.floor(height * 0.55) },
    { x: Math.floor(width * 0.25), y: Math.floor(height * 0.28), w: Math.floor(width * 0.5), h: Math.floor(height * 0.4) },
  ];

  for (const region of regions) {
    const crop = image.clone().crop({ x: region.x, y: region.y, w: region.w, h: region.h });
    for (const scale of [1, 2, 3]) {
      const scaled = crop.clone().scale({ w: region.w * scale, h: region.h * scale });
      const rgba = new Uint8ClampedArray(scaled.bitmap.data);
      const code = jsQR(rgba, scaled.bitmap.width, scaled.bitmap.height, {
        inversionAttempts: 'attemptBoth',
      });
      if (code?.data) {
        console.log('QR:', code.data);
        return;
      }
    }
  }

  console.log('No QR code found');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
