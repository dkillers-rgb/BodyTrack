import { mapTcyCodeValue, extractKeyFromQrUrl } from '../backend/src/services/tcyReportService.ts';

const sampleCodeValue =
  '["155","164","F","24","160","13:45 2026.06.23","28.1","27.4","33.4","7.6","7.4","9.0","2.6","2.5","3.0","22.8","10.8","17.2","61.2","45.7","61.8","20.6","20.2","24.7","38.4","23.9","18.5","23.0","37.3","18.0","28.0","0.9","0.8","0.9","32.6","18.5","26.7","10","1.9","1.3","1.9","1.3","6.1","3.1","5.8","3.2","17.2","11.7","53.8","-7.4","-10.5","3.0","1198","68","24","4"]';

const report = mapTcyCodeValue(sampleCodeValue);

const expected = {
  peso: 61.2,
  massaMuscularEsqueletica: 20.6,
  gorduraCorporal: 22.8,
  gorduraVisceral: 10,
};

for (const [key, value] of Object.entries(expected)) {
  const got = report[key as keyof typeof expected];
  if (got !== value) {
    console.error(`FAIL ${key}: expected ${value}, got ${got}`);
    process.exit(1);
  }
}

const sampleQr =
  'https://119.23.70.228/tcy/index.html?lang=en&key=d067848a0baba8e41516f9934fd2cec7';
const key = extractKeyFromQrUrl(sampleQr);
if (key !== 'd067848a0baba8e41516f9934fd2cec7') {
  console.error('FAIL key extraction:', key);
  process.exit(1);
}

console.log('OK — TCY mapping:', report);
