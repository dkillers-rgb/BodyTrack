import { parseOcrText } from '../backend/src/services/ocrParser';

const crop = `
m—sss | 45.7~61.8 Skeletal Muscle [Mnormst
20.2~24.7 . Me
—ss | 457-618 srccrwascie [Minos
20.2~24.7 | A.
I? 1.6 18.5~23.0 soarfat [Mino
`;

console.log(parseOcrText(`Muscle Fat Analysis\n${crop}\n3 Overweight Analysis`).muscleFat);
console.log(parseOcrText(`--- MFA SECTION OCR ---\n${crop}`).muscleFat);
