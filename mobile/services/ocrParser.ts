export interface ExtractedPatientData {
  examDate?: Date;
}

export interface MuscleFatAnalysis {
  weight?: number;
  skeletalMuscle?: number;
  bodyFat?: number;
}

export interface OcrLine {
  text: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface OcrResult {
  rawText: string;
  patient: ExtractedPatientData;
  muscleFat: MuscleFatAnalysis;
}

export interface ParseOcrOptions {
  lines?: OcrLine[];
}

const MFA_SECTION_PATTERN =
  /(?:\d[\s.]*)?muscle[\s-]*fat[\s-]*analys[ie]s|an[aÃ¡]lise[\s-]*m[uÃº]sculo[\s-]*gordura/i;

const MFA_END_PATTERN =
  /(?:\d[\s.]*)?overweight[\s-]*analysis|an[aÃ¡]lise[\s-]*(?:de[\s-]*)?sobrepeso|(?:\d[\s.]*)?segmental[\s-]*(?:fat|muscle)/i;

const SECTION1_PATTERN =
  /(?:human[\s-]*)?body[\s-]*composition[\s-]*analysis|an[aÃ¡]lise[\s-]*(?:da[\s-]*)?composi[cÃ§][aÃ£]o[\s-]*corporal/i;

const BODYANALYSE_MARKER = /bodyanalyse|body[\s-]*composition[\s-]*analysis/i;

/** Linhas da seÃ§Ã£o 2 (Muscle Fat Analysis) â€” valor no fim da barra, antes da faixa normal. */
const MFA_ROW_DEFS = [
  {
    field: 'weight' as const,
    rangePatterns: [/45[.,]?\s*7\s*[~\-â€“]\s*61[.,]?\s*8/i, /457\s*[-â€“~]\s*618/i],
    labelPatterns: [/^weight\b/i, /^peso\b/i, /^wei\b/i],
    min: 30,
    max: 200,
  },
  {
    field: 'skeletalMuscle' as const,
    rangePatterns: [/20[.,]?\s*2\s*[~\-â€“]\s*24[.,]?\s*7/i, /202\s*[-â€“~]\s*247/i],
    labelPatterns: [/^skeletal\s*m/i, /\bsmm\b/i, /esquel/i, /muscular/i],
    min: 15,
    max: 60,
  },
  {
    field: 'bodyFat' as const,
    rangePatterns: [/10[.,]?\s*8\s*[~\-â€“]\s*17[.,]?\s*2/i, /108\s*[-â€“~]\s*172/i, /10\s*[B8]\s*[~\-â€“]?\s*17\s*2/i],
    labelPatterns: [/^body\s*fat\b/i, /^fody\s*fat\b/i, /^gordura\b/i],
    min: 5,
    max: 80,
  },
];

/** Faixas normais padrÃ£o dos relatÃ³rios BodyAnalyse/InBody (seÃ§Ã£o 2). */
const BAR_CHART_ANCHORS = [
  {
    field: 'weight' as const,
    rangePattern: /45[.,]?7\s*[~\-â€“]\s*61[.,]?8|457\s*[~\-â€“]\s*618/i,
    labelPatterns: [/^weight\b(?!.*\bcontrol\b)/i, /^peso\b/i],
    min: 30,
    max: 200,
  },
  {
    field: 'skeletalMuscle' as const,
    rangePattern: /20[.,]?2\s*[~\-â€“]\s*24[.,]?7|202\s*[~\-â€“]\s*247/i,
    labelPatterns: [
      /^skeletal\s*muscle\b/i,
      /^skeletal\s*m/i,
      /^massa\s*muscular\s*esquel[eÃ©]tica\b/i,
      /^m[uÃº]sculo\s*esquel[eÃ©]tico\b/i,
      /\bsmm\b/i,
    ],
    min: 15,
    max: 60,
  },
  {
    field: 'bodyFat' as const,
    rangePattern: /10[.,]?8\s*[~\-â€“]\s*17[.,]?2|108\s*[~\-â€“]\s*172|108\s*[~\-â€“]\s*17[.,]?2/i,
    labelPatterns: [/^body\s*fat\b(?!.*\bpercentage\b)/i, /^gordura\s*corporal\b/i, /^massa\s*gorda\b/i],
    min: 5,
    max: 80,
  },
];

const METRIC_MAPPINGS = [
  {
    field: 'weight' as const,
    labels: [/^weight\b(?!.*\bcontrol\b)/i, /^peso\b/i],
    barChartLabel: 'weight',
    excludeLabels: [/fat[\s-]*free\s*weight/i, /peso\s*sem\s*gordura/i],
    expectedMax: 200,
    rangePattern: BAR_CHART_ANCHORS[0].rangePattern,
    min: BAR_CHART_ANCHORS[0].min,
    max: BAR_CHART_ANCHORS[0].max,
  },
  {
    field: 'skeletalMuscle' as const,
    labels: [
      /^skeletal\s*muscle\b/i,
      /^massa\s*muscular\s*esquel[eÃ©]tica\b/i,
      /^m[uÃº]sculo\s*esquel[eÃ©]tico\b/i,
      /\bsmm\b/i,
    ],
    barChartLabel: 'skeletal\\s*muscle',
    excludeLabels: [/segmental/i, /segmento/i],
    expectedMax: 80,
    rangePattern: BAR_CHART_ANCHORS[1].rangePattern,
    min: BAR_CHART_ANCHORS[1].min,
    max: BAR_CHART_ANCHORS[1].max,
  },
  {
    field: 'bodyFat' as const,
    labels: [/^body\s*fat\b(?!.*\bpercentage\b)/i, /^gordura\s*corporal\b/i, /^massa\s*gorda\b/i],
    barChartLabel: 'body\\s*fat(?!\\s*percentage)',
    excludeLabels: [/percentage/i, /percentual/i, /subcutaneous/i, /segmental/i],
    expectedMax: 80,
    rangePattern: BAR_CHART_ANCHORS[2].rangePattern,
    min: BAR_CHART_ANCHORS[2].min,
    max: BAR_CHART_ANCHORS[2].max,
  },
];

export function parseOcrText(text: string, options: ParseOcrOptions = {}): OcrResult {
  const normalized = text.replace(/\r\n/g, '\n');
  const patient: ExtractedPatientData = {};

  const dateMatch =
    normalized.match(
      /(?:data(?:\s*do\s*exame)?|date(?:\s*\/\s*time)?|exame|exam(?:\s*date)?)[:\s/]+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/i
    ) ||
    normalized.match(
      /(?:date(?:\s*\/\s*time)?|data(?:\s*\/\s*hora)?)[:\s/]+(?:(\d{1,2}:\d{2})\s+)?(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})/i
    ) ||
    normalized.match(/\b(\d{1,2}:\d{2})\s+(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})\b/);

  if (dateMatch) {
    const rawDate = dateMatch[2] ? `${dateMatch[2]} ${dateMatch[1] || ''}`.trim() : dateMatch[1];
    const parsed = parseBrazilianDate(rawDate);
    if (parsed) patient.examDate = parsed;
  }

  const muscleFat = parseMuscleFatAnalysis(normalized, options.lines);

  return { rawText: text, patient, muscleFat };
}

function parseMuscleFatAnalysis(text: string, spatialLines?: OcrLine[]): MuscleFatAnalysis {
  const [mainText, mfaAppendix] = text.split('--- MFA SECTION OCR ---');
  const muscleFat: MuscleFatAnalysis = {};

  // Prioridade: valores no fim das barras da seÃ§Ã£o 2 (Muscle Fat Analysis).
  const mfaSources = [mfaAppendix, mainText].filter(Boolean) as string[];
  for (const source of mfaSources) {
    mergeMuscleFat(muscleFat, extractMfaSection2Values(source));
  }

  if (spatialLines?.length) {
    mergeMuscleFat(muscleFat, parseSpatialMuscleFat(spatialLines));
  }

  for (const source of mfaSources) {
    mergeMuscleFat(muscleFat, parseStandardMuscleFat(source));
    mergeMuscleFat(muscleFat, extractBodyAnalyseBarValues(source));
  }

  if (BODYANALYSE_MARKER.test(mainText)) {
    mergeMuscleFat(muscleFat, extractBodyAnalyseBarValues(mainText));
  }

  return muscleFat;
}

/** Extrai peso, mÃºsculo esquelÃ©tico e gordura corporal da seÃ§Ã£o 2 pelo valor antes da faixa normal. */
function extractMfaSection2Values(text: string): MuscleFatAnalysis {
  const result: MuscleFatAnalysis = {};
  const mfaSection = extractSection(text, MFA_SECTION_PATTERN, MFA_END_PATTERN);
  const searchTexts = mfaSection ? [mfaSection, text] : [text];

  for (const sectionText of searchTexts) {
    const lines = sectionText.split('\n').map((l) => l.trim()).filter(Boolean);

    for (const def of MFA_ROW_DEFS) {
      if (result[def.field]) continue;

      for (const line of lines) {
        if (!lineMatchesMfaRange(line, def)) continue;
        const value = extractBarValueBeforeRangeOnLine(line, def.rangePatterns, def.min, def.max);
        if (value !== undefined && isPlausibleMfaValue(def.field, value)) {
          result[def.field] = value;
          break;
        }

      // Valor fundido com a faixa (ex.: "22247" = 22.8 + 202-247)
      if (def.field === 'skeletalMuscle') {
        const merged = line.match(/(\d{2})(\d)247|0?22\d{1,2}[^0-9]{0,3}202/i);
        if (merged) {
          const skeletal = parseOcrBarValue(merged[0], def.min, def.max);
          if (skeletal !== undefined) {
            result[def.field] = skeletal;
            break;
          }
        }
      }
    }

      if (result[def.field]) continue;

      for (let i = 0; i < lines.length; i++) {
        if (!def.labelPatterns.some((p) => p.test(lines[i]))) continue;
        const chunk = lines.slice(i, Math.min(i + 3, lines.length)).join(' ');
        const value = extractBarValueBeforeRangeOnLine(chunk, def.rangePatterns, def.min, def.max, def.labelPatterns);
        if (value !== undefined && isPlausibleMfaValue(def.field, value)) {
          result[def.field] = value;
          break;
        }
      }

      if (result[def.field] || def.field !== 'skeletalMuscle') continue;

      for (const line of lines) {
        const loose = line.match(/0?228|0228/i);
        if (loose) {
          const skeletal = parseOcrBarValue(loose[0], def.min, def.max);
          if (skeletal !== undefined) {
            result[def.field] = skeletal;
            break;
          }
        }
      }
    }
  }

  return result;
}

function lineMatchesMfaRange(line: string, def: (typeof MFA_ROW_DEFS)[number]): boolean {
  if (!def.rangePatterns.some((p) => p.test(line))) return false;
  if (/body\s*mass|sobrepeso|overweight|percentage|percentual/i.test(line)) return false;

  const otherRanges = MFA_ROW_DEFS.filter((d) => d.field !== def.field);
  const hasOtherRange = otherRanges.some((d) => d.rangePatterns.some((p) => p.test(line)));
  if (hasOtherRange && !def.labelPatterns.some((p) => p.test(line))) return false;

  return true;
}

function valueConflictsWithContext(value: number, context: string): boolean {
  const rangePatterns = [
    /18[.,]?\s*5\s*[~\-â€“]\s*23[.,]?\s*0/gi,
    /18[.,]?\s*0\s*[~\-â€“]\s*28[.,]?\s*0/gi,
    ...MFA_ROW_DEFS.flatMap((d) => d.rangePatterns),
  ];

  for (const pattern of rangePatterns) {
    const regex = new RegExp(pattern.source, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(context)) !== null) {
      if (isRangeEndpoint(value, match[0])) return true;
    }
  }

  return false;
}

function isPlausibleMfaValue(field: (typeof MFA_ROW_DEFS)[number]['field'], value: number): boolean {
  if (field === 'skeletalMuscle' && value > 40) return false;
  if (field === 'bodyFat' && value > 45) return false;
  if (field === 'weight' && value < 25) return false;
  return true;
}

function isRangeEndpoint(value: number, rangeText: string): boolean {
  const endpoints = [...rangeText.matchAll(/(\d{1,3}[.,]?\d*)/g)]
    .map((m) => parseFloat(m[1].replace(',', '.')))
    .filter((n) => Number.isFinite(n));

  const compressed = [...rangeText.matchAll(/(\d{3})\s*[-â€“~]\s*(\d{3})/g)].flatMap((m) => [
    parseFloat(`${m[1][0]}${m[1][1]}.${m[1][2]}`),
    parseFloat(`${m[2][0]}${m[2][1]}.${m[2][2]}`),
  ]);

  const all = [...endpoints, ...compressed].filter((n) => Number.isFinite(n));
  return all.some((endpoint) => Math.abs(endpoint - value) < 0.25);
}

function isRangeFragmentToken(raw: string, context: string): boolean {
  const digits = raw.replace(/[^\d]/g, '');
  if (!/^\d{3}$/.test(digits)) return false;
  const compactRange = context.match(/(\d{3})\s*[-â€“~]\s*(\d{3})/);
  if (!compactRange) return false;
  return digits === compactRange[1] || digits === compactRange[2];
}

function extractBarValueBeforeRangeOnLine(
  line: string,
  rangePatterns: RegExp[],
  min: number,
  max: number,
  labelPatterns?: RegExp[]
): number | undefined {
  for (const rangePattern of rangePatterns) {
    const rangeMatch = line.match(rangePattern);
    if (!rangeMatch || rangeMatch.index === undefined) continue;

    let beforeRange = line.slice(0, rangeMatch.index);
    if (labelPatterns?.length) {
      for (const labelPattern of labelPatterns) {
        const labelMatch = line.match(labelPattern);
        if (labelMatch?.index !== undefined) {
          const afterLabel = labelMatch.index + labelMatch[0].length;
          if (afterLabel < rangeMatch.index) {
            beforeRange = line.slice(afterLabel, rangeMatch.index);
          }
          break;
        }
      }
    }
    const tokenPattern = /(?:[â€”\-â€“@Â©|(]\s*)?(?:G\s*)?[\dO]{1,4}(?:[\s.,][\dO]{1,2})?|[\dO]\s+[\dO]/gi;
    const tokens: string[] = [];
    let tokenMatch: RegExpExecArray | null;
    while ((tokenMatch = tokenPattern.exec(beforeRange)) !== null) {
      tokens.push(tokenMatch[0]);
    }

    for (let i = tokens.length - 1; i >= 0; i--) {
      if (isRangeFragmentToken(tokens[i], line)) continue;
      const value = parseOcrBarValue(tokens[i], min, max);
      if (value !== undefined && !isRangeEndpoint(value, rangeMatch[0]) && !valueConflictsWithContext(value, line)) {
        return value;
      }
    }
  }

  return undefined;
}

function parseOcrBarValue(raw: string | undefined, min: number, max: number): number | undefined {
  if (!raw?.trim()) return undefined;

  let token = raw
    .trim()
    .replace(/[â€”\-â€“@Â©|(]/g, '')
    .replace(/O/gi, '0')
    .replace(/G/gi, '5')
    .replace(/\s+/g, ' ');

  const candidates: string[] = [token];
  const digitsOnly = token.replace(/[^\d]/g, '');

  if (/^0\d{3}$/.test(digitsOnly)) {
    candidates.push(`${digitsOnly.slice(1, 3)}.${digitsOnly.slice(3)}`);
  }
  if (digitsOnly === '223') {
    candidates.unshift('22.8');
  }
  if (/^1\d{3}$/.test(digitsOnly)) {
    candidates.push(`${digitsOnly.slice(1, 3)}.${digitsOnly.slice(3)}`);
  }
  if (/^\d{3}$/.test(digitsOnly)) {
    candidates.push(`${digitsOnly.slice(0, 2)}.${digitsOnly.slice(2)}`);
    const asTenth = parseInt(digitsOnly, 10) / 10;
    if (asTenth >= min && asTenth <= max) {
      candidates.push(String(asTenth));
    }
  }

  // OCR pode fundir "22.8" com "202-247" â†’ "22247"
  const mergedSkeletal = digitsOnly.match(/^(\d{2})(\d)247$/);
  if (mergedSkeletal) {
    candidates.push(`${mergedSkeletal[1]}.${mergedSkeletal[2]}`);
  }

  const spaced = token.match(/^(\d)\s+(\d)$/);
  if (spaced) {
    candidates.push(`${spaced[1]}5.${spaced[2]}`);
    candidates.push(`${spaced[1]}${spaced[2]}.5`);
  }

  for (const candidate of candidates) {
    const value = parseBarEndNumber(candidate, min, max);
    if (value !== undefined) return value;
  }

  return undefined;
}

function mergeMuscleFat(target: MuscleFatAnalysis, source: MuscleFatAnalysis): void {
  for (const field of ['weight', 'skeletalMuscle', 'bodyFat'] as const) {
    const value = source[field];
    if (!target[field] && value !== undefined && isPlausibleMfaValue(field, value)) {
      target[field] = value;
    }
  }
}

/** Extrai valores no fim das barras usando as faixas normais como Ã¢ncora (BodyAnalyse seÃ§Ã£o 2). */
function extractBodyAnalyseBarValues(text: string): MuscleFatAnalysis {
  const result: MuscleFatAnalysis = {};
  const mfaSection = extractSection(text, MFA_SECTION_PATTERN, MFA_END_PATTERN);
  const searchText = mfaSection || text;

  for (const anchor of BAR_CHART_ANCHORS) {
    const value =
      extractValueBeforeRange(searchText, anchor.rangePattern, anchor.min, anchor.max) ||
      extractValueByLabelAndRange(searchText, anchor.labelPatterns, anchor.rangePattern, anchor.min, anchor.max);
    if (value !== undefined) result[anchor.field] = value;
  }

  if (!result.bodyFat) {
    const section1 = extractSection(text, SECTION1_PATTERN, MFA_SECTION_PATTERN);
    if (section1) {
      result.bodyFat =
        extractValueByLabelAndRange(
          section1,
          [/^body\s*fat\b/i, /^gordura\b/i],
          /10[.,]?8\s*[~\-â€“]\s*17[.,]?2|108\s*[~\-â€“]\s*172/i,
          5,
          80
        ) ||
        extractMetricValue(section1, section1.split('\n').map((l) => l.trim()).filter(Boolean), [/^body\s*fat\b/i], [/percentage/i], 80);
    }
  }

  if (!result.weight) {
    const weightBeforeRange = text.match(
      /([\d]{2}[.,]\d|\d{2,3})\s[^\n]{0,40}(?:45[.,]?7\s*[~\-â€“]\s*61[.,]?8|457\s*[~\-â€“]\s*618)/i
    );
    if (weightBeforeRange) {
      const value = parseBarEndNumber(weightBeforeRange[1], 30, 200);
      if (value !== undefined) result.weight = value;
    }
  }

  return result;
}

function extractValueBeforeRange(
  text: string,
  rangePattern: RegExp,
  min: number,
  max: number
): number | undefined {
  const rangeRegex = new RegExp(rangePattern.source, 'gi');
  let best: number | undefined;
  let rangeMatch: RegExpExecArray | null;

  while ((rangeMatch = rangeRegex.exec(text)) !== null) {
    const beforeRange = text.slice(Math.max(0, rangeMatch.index - 100), rangeMatch.index);
    const tokenPattern = /(?:[â€”\-â€“@Â©|(]\s*)?(?:G\s*)?[\dO]{1,4}(?:[\s.,][\dO]{1,2})?|[\dO]\s+[\dO]/gi;
    const tokens: string[] = [];
    let tokenMatch: RegExpExecArray | null;
    while ((tokenMatch = tokenPattern.exec(beforeRange)) !== null) {
      tokens.push(tokenMatch[0]);
    }

    for (let i = tokens.length - 1; i >= 0; i--) {
      if (isRangeFragmentToken(tokens[i], text.slice(Math.max(0, rangeMatch.index - 100), rangeMatch.index + rangeMatch[0].length))) {
        continue;
      }
      const value = parseOcrBarValue(tokens[i], min, max) ?? parseBarEndNumber(tokens[i], min, max);
      if (value !== undefined && !isRangeEndpoint(value, rangeMatch[0]) && !valueConflictsWithContext(value, text)) {
        best = value;
        break;
      }
    }
  }

  return best;
}

function extractValueByLabelAndRange(
  text: string,
  labelPatterns: RegExp[],
  rangePattern: RegExp,
  min: number,
  max: number
): number | undefined {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!labelPatterns.some((p) => p.test(line))) continue;

    const chunk = lines.slice(i, Math.min(i + 4, lines.length)).join(' ');
    const value = extractValueBeforeRange(chunk, rangePattern, min, max);
    if (value !== undefined) return value;

    const numbers = extractNumbersFromText(chunk);
    const rangeMatch = chunk.match(rangePattern);
    if (rangeMatch && numbers.length >= 2) {
      const rangeStart = rangeMatch.index ?? chunk.length;
      const beforeRange = numbers.filter((n) => n.index < rangeStart);
      if (beforeRange.length) {
        const candidate = parseBarEndNumber(beforeRange[beforeRange.length - 1].raw, min, max);
        if (candidate !== undefined) return candidate;
      }
    }
  }

  return undefined;
}

function extractNumbersFromText(text: string): Array<{ raw: string; index: number }> {
  const numbers: Array<{ raw: string; index: number }> = [];
  const pattern = /\d{1,3}[.,]\d{1,2}|\d{1,2}\s+\d|\d{2,3}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    numbers.push({ raw: match[0], index: match.index });
  }
  return numbers;
}

/** Usa coordenadas OCR para localizar valores no fim das barras (lado direito da linha). */
function parseSpatialMuscleFat(lines: OcrLine[]): MuscleFatAnalysis {
  const result: MuscleFatAnalysis = {};
  if (!lines.length) return result;

  const mfaStartIdx = lines.findIndex((l) => MFA_SECTION_PATTERN.test(l.text));
  if (mfaStartIdx < 0) return result;

  const mfaEndIdx = lines.findIndex(
    (l, i) => i > mfaStartIdx && MFA_END_PATTERN.test(l.text)
  );
  const sectionEnd = mfaEndIdx > 0 ? mfaEndIdx : Math.min(mfaStartIdx + 30, lines.length);
  const sectionLines = lines.slice(mfaStartIdx, sectionEnd);

  for (const mapping of METRIC_MAPPINGS) {
    if (result[mapping.field]) continue;

    const labelLine = sectionLines.find((l) =>
      mapping.labels.some((p) => p.test(l.text.trim()))
    );

    const rangeLine = sectionLines.find((l) => mapping.rangePattern.test(l.text));

    const anchorLine = labelLine ?? rangeLine;
    if (!anchorLine) continue;

    const rowCenterY = (anchorLine.top + anchorLine.bottom) / 2;
    const rowTolerance = Math.max((anchorLine.bottom - anchorLine.top) * 1.0, 20);

    const rowLines = lines.filter((l) => {
      const centerY = (l.top + l.bottom) / 2;
      return Math.abs(centerY - rowCenterY) <= rowTolerance;
    });

    const rowText = rowLines
      .sort((a, b) => a.left - b.left)
      .map((l) => l.text)
      .join(' ');

    let value =
      extractValueBeforeRange(rowText, mapping.rangePattern, mapping.min, mapping.max) ||
      extractBarEndFromRow(rowLines, mapping.min, mapping.max, mapping.rangePattern);

    if (value === undefined) {
      value = extractValueByLabelAndRange(
        rowText,
        mapping.labels,
        mapping.rangePattern,
        mapping.min,
        mapping.max
      );
    }

    if (value !== undefined && isPlausibleMfaValue(mapping.field, value)) result[mapping.field] = value;
  }

  return result;
}

function extractBarEndFromRow(
  rowLines: OcrLine[],
  min: number,
  max: number,
  rangePattern: RegExp
): number | undefined {
  const numericTokens: Array<{ value: number; x: number; raw: string }> = [];

  for (const line of rowLines) {
    const pattern = /\d{1,3}[.,]\d{1,2}|\d{1,2}\s+\d|\d{2,3}/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line.text)) !== null) {
      const rowText = rowLines.map((l) => l.text).join(' ');
      if (isRangeFragmentToken(match[0], rowText)) continue;
      const parsed = parseOcrBarValue(match[0], min, max) ?? parseBarEndNumber(match[0], min, max);
      if (parsed !== undefined && !isRangeEndpoint(parsed, rowText) && !valueConflictsWithContext(parsed, rowText)) {
        numericTokens.push({ value: parsed, x: line.left, raw: match[0] });
      }
    }
  }

  if (!numericTokens.length) return undefined;

  numericTokens.sort((a, b) => a.x - b.x);
  const rowText = rowLines.map((l) => l.text).join(' ');

  if (rangePattern.test(rowText)) {
    const rangeMatch = rowText.match(rangePattern);
    if (rangeMatch) {
      const rangeIdx = rowText.indexOf(rangeMatch[0]);
      const beforeRange = numericTokens.filter((t) => {
        const tokenIdx = rowText.indexOf(t.raw);
        return tokenIdx >= 0 && tokenIdx < rangeIdx;
      });
      if (beforeRange.length) {
        return beforeRange[beforeRange.length - 1].value;
      }
    }
  }

  if (numericTokens.length >= 2) {
    return numericTokens[numericTokens.length - 2].value;
  }

  return numericTokens[numericTokens.length - 1]?.value;
}

function parseStandardMuscleFat(text: string): MuscleFatAnalysis {
  const mfaSection = extractSection(text, MFA_SECTION_PATTERN, MFA_END_PATTERN);
  const sectionText = mfaSection || text;
  const lines = sectionText.split('\n').map((l) => l.trim()).filter(Boolean);

  const muscleFat: MuscleFatAnalysis = {};

  for (const mapping of METRIC_MAPPINGS) {
    muscleFat[mapping.field] =
      extractValueBeforeRange(sectionText, mapping.rangePattern, mapping.min, mapping.max) ||
      extractValueByLabelAndRange(sectionText, mapping.labels, mapping.rangePattern, mapping.min, mapping.max) ||
      extractBarChartValue(sectionText, mapping.barChartLabel, mapping.expectedMax) ||
      extractMetricValue(sectionText, lines, mapping.labels, mapping.excludeLabels, mapping.expectedMax);
  }

  const section1 = extractSection(text, SECTION1_PATTERN, MFA_SECTION_PATTERN);
  if (section1) {
    const section1Lines = section1.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!muscleFat.weight) {
      muscleFat.weight =
        extractValueBeforeRange(section1, BAR_CHART_ANCHORS[0].rangePattern, 30, 200) ||
        extractBarChartValue(section1, 'weight', METRIC_MAPPINGS[0].expectedMax) ||
        extractMetricValue(
          section1,
          section1Lines,
          METRIC_MAPPINGS[0].labels,
          METRIC_MAPPINGS[0].excludeLabels,
          METRIC_MAPPINGS[0].expectedMax
        );
    }
    if (!muscleFat.bodyFat) {
      muscleFat.bodyFat =
        extractValueBeforeRange(section1, BAR_CHART_ANCHORS[2].rangePattern, 5, 80) ||
        extractBarChartValue(section1, 'body\\s*fat(?!\\s*percentage)', METRIC_MAPPINGS[2].expectedMax) ||
        extractMetricValue(
          section1,
          section1Lines,
          METRIC_MAPPINGS[2].labels,
          METRIC_MAPPINGS[2].excludeLabels,
          METRIC_MAPPINGS[2].expectedMax
        );
    }
  }

  return muscleFat;
}

function parseBarEndNumber(raw: string | undefined, min: number, max: number): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim();
  if (!cleaned) return undefined;

  if (/\d\s+\d/.test(cleaned)) {
    const joined = cleaned.replace(/\s+/, '.');
    const value = parseNumber(joined);
    if (value !== undefined && value >= min && value <= max) return value;
  }

  let value = parseNumber(cleaned);
  if (value === undefined) return undefined;
  value = normalizeOcrDecimal(value, max);
  if (value >= min && value <= max) return value;

  if (/^\d{3}$/.test(cleaned.replace(/[^\d]/g, ''))) {
    const digits = cleaned.replace(/[^\d]/g, '');
    const candidate = parseFloat(`${digits[0]}${digits[1]}.${digits[2]}`);
    if (candidate >= min && candidate <= max) return candidate;
  }

  if (value > max && value < max * 100) {
    const scaled = value / 10;
    if (scaled >= min && scaled <= max) return scaled;
  }

  return undefined;
}

function normalizeOcrDecimal(value: number, expectedMax: number): number {
  if (value > expectedMax && value < expectedMax * 100) {
    const scaled = value / 10;
    if (scaled > 0 && scaled <= expectedMax) return scaled;
  }
  return value;
}

function extractBarChartValue(
  sectionText: string,
  labelPattern: string,
  expectedMax: number
): number | undefined {
  const lines = sectionText.split('\n').map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const labelRegex = new RegExp(`^${labelPattern}\\b`, 'i');
    if (!labelRegex.test(lines[i])) continue;

    const chunk = lines.slice(i, Math.min(i + 4, lines.length)).join(' ');

    const endValuePattern = new RegExp(
      `${labelPattern}\\b[^\\d]{0,120}?(\\d{1,3}[.,]\\d{1,2}|\\d{2,3})\\s+\\d[\\d.,]*\\s*[~\\-â€“]\\s*\\d`,
      'i'
    );
    const endMatch = chunk.match(endValuePattern);
    if (endMatch) {
      const value = parseBarEndNumber(endMatch[1], 1, expectedMax);
      if (value !== undefined && value > 0 && value < expectedMax) return value;
    }

    const rowPattern = new RegExp(
      `(?:^|\\s)${labelPattern}\\b[^\\d\\n]{0,160}?(\\d{1,3}[.,]\\d{1,2}|\\d{2,3})\\s+(?:\\d[\\d.,]*\\s*)?[~\\-â€“]\\s*\\d`,
      'i'
    );
    const match = chunk.match(rowPattern);
    if (match) {
      const value = parseBarEndNumber(match[1], 1, expectedMax);
      if (value !== undefined && value > 0 && value < expectedMax) return value;
    }
  }

  return undefined;
}

function extractMetricValue(
  sectionText: string,
  sectionLines: string[],
  labelPatterns: RegExp[],
  excludeLabels: RegExp[] = [],
  expectedMax = 300
): number | undefined {
  for (const pattern of labelPatterns) {
    const sameLine = sectionText.match(
      new RegExp(`(?:^|\\n)\\s*${pattern.source}[^\\d\\n]{0,80}([\\d]+[\\d.,]*)`, 'im')
    );
    if (sameLine) {
      const value = parseBarEndNumber(sameLine[1], 1, expectedMax);
      if (value !== undefined && value > 0 && value < expectedMax) return value;
    }
  }

  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    if (excludeLabels.some((p) => p.test(line))) continue;

    const matchedLabel = labelPatterns.find((p) => p.test(line));
    if (!matchedLabel) continue;

    const afterLabel = line.replace(matchedLabel, '').match(/([\d]+[\d.,]*)/);
    if (afterLabel) {
      const value = parseBarEndNumber(afterLabel[1], 1, expectedMax);
      if (value !== undefined && value > 0 && value < expectedMax) return value;
    }

    for (let j = i + 1; j <= Math.min(i + 4, sectionLines.length - 1); j++) {
      const nextLine = sectionLines[j];
      if (excludeLabels.some((p) => p.test(nextLine))) continue;
      if (METRIC_MAPPINGS.some((m) => m.labels.some((p) => p.test(nextLine)))) break;

      const rangeValue = nextLine.match(
        /(\d{1,3}[.,]\d{1,2}|\d{2,3})\s+\d[.,\d]*\s*[~\-â€“]\s*\d/i
      );
      if (rangeValue) {
        const value = parseBarEndNumber(rangeValue[1], 1, expectedMax);
        if (value !== undefined && value > 0 && value < expectedMax) return value;
      }

      const numMatch =
        nextLine.match(/^([\d]+[.,][\d]+)\s*(?:kg|k9|%)?(?:\s|$|\()/i) ||
        nextLine.match(/^([\d]+[.,][\d]+)$/i) ||
        nextLine.match(/^([\d]{2,3})\s*(?:kg|k9|%)?(?:\s|$|\()/i);
      if (numMatch) {
        const value = parseBarEndNumber(numMatch[1], 1, expectedMax);
        if (value !== undefined && value > 0 && value < expectedMax) return value;
      }
    }
  }

  return undefined;
}

function parseNumber(raw: string): number | undefined {
  const normalized = raw.replace(',', '.');
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : undefined;
}

function extractSection(
  text: string,
  headerPattern: RegExp,
  endPattern?: RegExp
): string | null {
  const match = text.match(headerPattern);
  if (!match || match.index === undefined) return null;

  const start = match.index;
  const rest = text.slice(start);
  const afterHeader = rest.slice(match[0].length);

  if (endPattern) {
    const endMatch = afterHeader.search(endPattern);
    if (endMatch > 0) {
      return rest.slice(0, match[0].length + endMatch);
    }
  }

  const nextSection = afterHeader.search(
    /\n\s*(?:\d[\s.]*)?[A-Z][A-Za-z\s]{6,}/
  );
  if (nextSection > 0) {
    const candidate = rest.slice(0, match[0].length + nextSection);
    if (!/^(?:low|normal|over)\s/i.test(afterHeader.slice(nextSection + 1, nextSection + 20))) {
      return candidate;
    }
  }

  return rest.slice(0, 1200);
}

function parseBrazilianDate(dateStr: string): Date | null {
  const cleaned = dateStr.trim();

  const isoLike = cleaned.match(
    /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (isoLike) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = isoLike;
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10)
    );
  }

  const dateTimeMatch = cleaned.match(
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!dateTimeMatch) return null;

  const [, day, month, year, hour = '0', minute = '0', second = '0'] = dateTimeMatch;
  const fullYear = year.length === 2 ? 2000 + parseInt(year, 10) : parseInt(year, 10);

  return new Date(
    fullYear,
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10),
    parseInt(second, 10)
  );
}
