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
  /(?:\d[\s.]*)?muscle[\s-]*fat[\s-]*analys[ie]s|an[aá]lise[\s-]*m[uú]sculo[\s-]*gordura/i;

const MFA_END_PATTERN =
  /(?:\d[\s.]*)?overweight[\s-]*analysis|an[aá]lise[\s-]*(?:de[\s-]*)?sobrepeso|(?:\d[\s.]*)?segmental[\s-]*(?:fat|muscle)/i;

const SECTION1_PATTERN =
  /(?:human[\s-]*)?body[\s-]*composition[\s-]*analysis|an[aá]lise[\s-]*(?:da[\s-]*)?composi[cç][aã]o[\s-]*corporal/i;

const BODYANALYSE_MARKER = /bodyanalyse|body[\s-]*composition[\s-]*analysis/i;

/** Faixas normais padrão dos relatórios BodyAnalyse/InBody (seção 2). */
const BAR_CHART_ANCHORS = [
  {
    field: 'weight' as const,
    rangePattern: /45[.,]?7\s*[~\-–]\s*61[.,]?8|457\s*[~\-–]\s*618/i,
    labelPatterns: [/^weight\b(?!.*\bcontrol\b)/i, /^peso\b/i],
    min: 30,
    max: 200,
  },
  {
    field: 'skeletalMuscle' as const,
    rangePattern: /20[.,]?2\s*[~\-–]\s*24[.,]?7|202\s*[~\-–]\s*247/i,
    labelPatterns: [
      /^skeletal\s*muscle\b/i,
      /^skeletal\s*m/i,
      /^massa\s*muscular\s*esquel[eé]tica\b/i,
      /^m[uú]sculo\s*esquel[eé]tico\b/i,
      /\bsmm\b/i,
    ],
    min: 15,
    max: 60,
  },
  {
    field: 'bodyFat' as const,
    rangePattern: /10[.,]?8\s*[~\-–]\s*17[.,]?2|108\s*[~\-–]\s*172|108\s*[~\-–]\s*17[.,]?2/i,
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
      /^massa\s*muscular\s*esquel[eé]tica\b/i,
      /^m[uú]sculo\s*esquel[eé]tico\b/i,
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

  if (spatialLines?.length) {
    mergeMuscleFat(muscleFat, parseSpatialMuscleFat(spatialLines));
  }

  const sources = [mfaAppendix, mainText].filter(Boolean) as string[];

  for (const source of sources) {
    mergeMuscleFat(muscleFat, parseStandardMuscleFat(source));
    mergeMuscleFat(muscleFat, extractBodyAnalyseBarValues(source));
  }

  if (BODYANALYSE_MARKER.test(mainText)) {
    mergeMuscleFat(muscleFat, extractBodyAnalyseBarValues(mainText));
  }

  return muscleFat;
}

function mergeMuscleFat(target: MuscleFatAnalysis, source: MuscleFatAnalysis): void {
  for (const field of ['weight', 'skeletalMuscle', 'bodyFat'] as const) {
    if (!target[field] && source[field]) {
      target[field] = source[field];
    }
  }
}

/** Extrai valores no fim das barras usando as faixas normais como âncora (BodyAnalyse seção 2). */
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
          /10[.,]?8\s*[~\-–]\s*17[.,]?2|108\s*[~\-–]\s*172/i,
          5,
          80
        ) ||
        extractMetricValue(section1, section1.split('\n').map((l) => l.trim()).filter(Boolean), [/^body\s*fat\b/i], [/percentage/i], 80);
    }
  }

  if (!result.weight) {
    const weightBeforeRange = text.match(
      /([\d]{2}[.,]\d|\d{2,3})\s[^\n]{0,40}(?:45[.,]?7\s*[~\-–]\s*61[.,]?8|457\s*[~\-–]\s*618)/i
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
  const pattern = new RegExp(
    `(\\d{1,3}[.,]\\d{1,2}|\\d{1,2}\\s+\\d|\\d{2,3})\\s*[^\\d\\n~]{0,60}?${rangePattern.source}`,
    'gi'
  );

  let best: number | undefined;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const value = parseBarEndNumber(match[1], min, max);
    if (value !== undefined) {
      best = value;
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
    const labelLine = sectionLines.find((l) =>
      mapping.labels.some((p) => p.test(l.text.trim()))
    );
    if (!labelLine) continue;

    const rowCenterY = (labelLine.top + labelLine.bottom) / 2;
    const rowTolerance = Math.max((labelLine.bottom - labelLine.top) * 1.5, 30);

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

    if (value !== undefined) result[mapping.field] = value;
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
      const parsed = parseBarEndNumber(match[0], min, max);
      if (parsed !== undefined) {
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

function parseBarEndNumber(raw: string, min: number, max: number): number | undefined {
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
      `${labelPattern}\\b[^\\d]{0,120}?(\\d{1,3}[.,]\\d{1,2}|\\d{2,3})\\s+\\d[\\d.,]*\\s*[~\\-–]\\s*\\d`,
      'i'
    );
    const endMatch = chunk.match(endValuePattern);
    if (endMatch) {
      const value = parseBarEndNumber(endMatch[1], 1, expectedMax);
      if (value !== undefined && value > 0 && value < expectedMax) return value;
    }

    const rowPattern = new RegExp(
      `(?:^|\\s)${labelPattern}\\b[^\\d\\n]{0,160}?(\\d{1,3}[.,]\\d{1,2}|\\d{2,3})\\s+(?:\\d[\\d.,]*\\s*)?[~\\-–]\\s*\\d`,
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
        /(\d{1,3}[.,]\d{1,2}|\d{2,3})\s+\d[.,\d]*\s*[~\-–]\s*\d/i
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
    /\n\s*(?:\d[\s.]*)?[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-Za-zÀ-ú\s]{6,}/
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
