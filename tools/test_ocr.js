const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const svcPath = path.resolve(__dirname, '../backend/dist/services/ocrService.js');
    console.log('Loading service:', svcPath);
    const { processReportOcr } = require(svcPath);
    const pdfPath = path.resolve(__dirname, '../teste.pdf');
    const buffer = fs.readFileSync(pdfPath);
    console.log('Processing PDF...', pdfPath);
    const result = await processReportOcr(buffer, 'application/pdf');
    console.log('OCR Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Test OCR failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

run();
