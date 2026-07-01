import { parseOcrText } from '../backend/src/services/ocrParser';

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

// Simula OCR fragmentado (ML Kit) — valores em linhas separadas
const fragmentedOcr = `
2 Muscle Fat Analysis
Weight
55.5
45.7~61.8
Skeletal Muscle
22.8
20.2~24.7
Body Fat
13.9
10.8~17.2
3 Overweight Analysis
Body fat percentage (%) 25
`;

// Simula OCR pegando valores errados da seção 1/3
const messyOcr = `
Human Body Composition Analysis
Moisture Content 30.5
Protein 8.2
Body Fat 14.5
Weight 53.7

2 Muscle Fat Analysis
Weight 55.5 45.7~61.8
Skeletal Muscle 22.8 20.2~24.7
Body Fat 13.9 10.8~17.2

3 Overweight Analysis
Body fat percentage (%) 25
Body Mass Parameters 21.6
`;

const expected = { weight: 55.5, skeletalMuscle: 22.8, bodyFat: 13.9 };

function test(name: string, text: string) {
  const result = parseOcrText(text).muscleFat;
  let ok = true;
  for (const [k, v] of Object.entries(expected)) {
    if (result[k as keyof typeof expected] !== v) {
      console.log(`  FAIL ${k}: expected ${v}, got ${result[k as keyof typeof expected]}`);
      ok = false;
    }
  }
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) console.log('  result:', result);
}

console.log('=== OCR Parser Tests ===\n');
test('clean MFA section', mockOcr);
test('fragmented lines', fragmentedOcr);
test('messy with wrong section1', messyOcr);
