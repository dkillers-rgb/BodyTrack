const { parseOcrText } = require('../backend/dist/services/ocrParser.js');

const mockOcr = `
Human Body Composition Analysis
Moisture Content 30.5 27.4~33.4
Protein 8.2 7.4~9.0
Inorganic Salt 2.8 2.5~3.0
Body Fat 13.9 10.8~17.2
Weight 55.5 45.7~61.8

2 Muscle Fat Analysis
Low Standard Normal Over Standard Normal Range
Weight 55.5 45.7~61.8
Skeletal Muscle 22.8 20.2~24.7
Body Fat 13.9 10.8~17.2

3 Overweight Analysis
Body Mass Parameters 21.6 18.5~23.0
Body fat percentage (%) 25 18.0~28.0
`;

const result = parseOcrText(mockOcr);
console.log('muscleFat:', result.muscleFat);
const expected = { weight: 55.5, skeletalMuscle: 22.8, bodyFat: 13.9 };
let ok = true;
for (const [k, v] of Object.entries(expected)) {
  if (result.muscleFat[k] !== v) {
    console.log(`FAIL ${k}: expected ${v}, got ${result.muscleFat[k]}`);
    ok = false;
  }
}
console.log(ok ? 'PASS' : 'FAIL');
