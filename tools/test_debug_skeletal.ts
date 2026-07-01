import { parseOcrText } from '../backend/src/services/ocrParser';

const mfaCrop = `
m—sss | 45.7~61.8 Skeletal Muscle [Mnormst
20.2~24.7 . Me
—ss | 457-618 srccrwascie [Minos
20.2~24.7 | A.
stata ost 202-247 Mica: Desi Ease
`;

const full = `
fody Fat 13.9 10.8~17.2
Muscle Fat Analysis
wei —G5 5 457-618
a 202-247
--- MFA SECTION OCR ---
${mfaCrop}
`;

const r = parseOcrText(full);
console.log(r.muscleFat);
