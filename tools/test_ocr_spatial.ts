import { parseOcrText } from '../backend/src/services/ocrParser';
import type { OcrLine } from '../backend/src/services/ocrParser';

// Simula linhas espaciais do ML Kit com tokens separados (layout real do relatório)
const spatialLines: OcrLine[] = [
  { text: '2 Muscle Fat Analysis', left: 50, top: 400, right: 300, bottom: 420 },
  { text: 'Weight', left: 60, top: 440, right: 120, bottom: 460 },
  { text: '55.5', left: 350, top: 438, right: 390, bottom: 462 },
  { text: '45.7~61.8', left: 420, top: 440, right: 500, bottom: 460 },
  { text: 'Skeletal Muscle', left: 60, top: 480, right: 180, bottom: 500 },
  { text: '22.8', left: 350, top: 478, right: 390, bottom: 502 },
  { text: '20.2~24.7', left: 420, top: 480, right: 500, bottom: 500 },
  { text: 'Body Fat', left: 60, top: 520, right: 140, bottom: 540 },
  { text: '13.9', left: 350, top: 518, right: 390, bottom: 542 },
  { text: '10.8~17.2', left: 420, top: 520, right: 500, bottom: 540 },
  // Seção 3 — valores que NÃO devem ser usados
  { text: 'Body fat percentage (%)', left: 60, top: 600, right: 250, bottom: 620 },
  { text: '25', left: 300, top: 600, right: 330, bottom: 620 },
];

const rawText = `
Human Body Composition Analysis
Moisture Content 30.5
Protein 8.2
Body Fat 14.5
Weight 53.7
2 Muscle Fat Analysis
3 Overweight Analysis
Body fat percentage (%) 25
`;

const result = parseOcrText(rawText, { lines: spatialLines });
console.log('With spatial lines:', result.muscleFat);
const expected = { weight: 55.5, skeletalMuscle: 22.8, bodyFat: 13.9 };
for (const [k, v] of Object.entries(expected)) {
  const got = result.muscleFat[k as keyof typeof expected];
  console.log(`${k}: ${got === v ? 'OK' : `FAIL (expected ${v}, got ${got})`}`);
}

// Caso problemático: spatial retorna valor errado primeiro
const badSpatial: OcrLine[] = [
  { text: 'Weight', left: 60, top: 440, right: 120, bottom: 460 },
  { text: '53.7', left: 200, top: 440, right: 240, bottom: 460 }, // valor seção 1
  { text: '55.5', left: 350, top: 438, right: 390, bottom: 462 }, // valor correto seção 2
  { text: '45.7~61.8', left: 420, top: 440, right: 500, bottom: 460 },
];

const badResult = parseOcrText('2 Muscle Fat Analysis\nWeight\n3 Overweight', { lines: badSpatial });
console.log('\nBad spatial (two weight values):', badResult.muscleFat);
