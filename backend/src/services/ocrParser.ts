export interface ExtractedPatientData {
  examDate?: Date;
}

export interface MuscleFatAnalysis {
  weight?: number;
  skeletalMuscle?: number;
  bodyFat?: number;
}

export interface OcrResult {
  rawText: string;
  patient: ExtractedPatientData;
  muscleFat: MuscleFatAnalysis;
}

const MFA_SECTION_PATTERN =
  /(?:\d[\s.]*)?muscle[\s-]*fat[\s-]*analys[ie]s|an[aá]lise[\s-]*m[uú]sculo[\s-]*gordura|composi[cç][aã]o[\s-]*corporal/i;

const MFA_END_PATTERN =
  /(?:\d[\s.]*)?overweight[\s-]*analysis|an[aá]lise[\s-]*(?:de[\s-]*)?sobrepeso|(?:\d[\s.]*)?segmental[\s-]*fat/i;

const SECTION1_PATTERN =
  /(?:human[\s-]*)?body[\s-]*composition[\s-]*analysis|an[aá]lise[\s-]*(?:da[\s-]*)?composi[cç][aã]o[\s-]*corporal/i;

const BODYANALYSE_MARKER = /bodyanalyse|body[\s-]*composition[\s-]*analysis/i;

const METRIC_MAPPINGS = [
  {
    field: 'weight' as const,
    labels: [/^weight\b(?!.*\bcontrol\b)/i, /^peso\b/i],
    barChartLabel: 'weight',
    excludeLabels: [/fat[\s-]*free\s*weight/i, /peso\s*sem\s*gordura/i],
    expectedMax: 200,
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
  },
  {
    field: 'bodyFat' as const,
    labels: [/^body\s*fat\b(?!.*\bpercentage\b)/i, /^gordura\s*corporal\b/i, /^massa\s*gorda\b/i],
    barChartLabel: 'body\\s*fat(?!\\s*percentage)',
    excludeLabels: [/percentage/i, /percentual/i, /subcutaneous/i, /segmental/i],
    expectedMax: 80,
  },
];

export function parseOcrText(text: string): OcrResult {
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

  const muscleFat = parseMuscleFatAnalysis(normalized);

  return { rawText: text, patient, muscleFat };
}

function parseMuscleFatAnalysis(text: string): MuscleFatAnalysis {
  const [mainText, mfaAppendix] = text.split('--- MFA SECTION OCR ---');
  const muscleFat: MuscleFatAnalysis = {};

  const sources = [mfaAppendix, mainText].filter(Boolean) as string[];

  for (const source of sources) {
    mergeMuscleFat(muscleFat, parseStandardMuscleFat(source));
  }

  if (mfaAppendix) {
    mergeMuscleFat(muscleFat, extractBodyAnalyseMetrics(mfaAppendix));
  }
  if (BODYANALYSE_MARKER.test(mainText)) {
    mergeMuscleFat(muscleFat, extractBodyAnalyseMetrics(mainText));
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

function parseStandardMuscleFat(text: string): MuscleFatAnalysis {
  const mfaSection = extractSection(text, MFA_SECTION_PATTERN, MFA_END_PATTERN);
  const sectionText = mfaSection || text;
  const lines = sectionText.split('\n').map((l) => l.trim()).filter(Boolean);

  const muscleFat: MuscleFatAnalysis = {};

  for (const mapping of METRIC_MAPPINGS) {
    muscleFat[mapping.field] =
      extractBarChartValue(sectionText, mapping.barChartLabel, mapping.expectedMax) ||
      extractMetricValue(sectionText, lines, mapping.labels, mapping.excludeLabels, mapping.expectedMax);
  }

  const section1 = extractSection(text, SECTION1_PATTERN, MFA_SECTION_PATTERN);
  if (section1) {
    const section1Lines = section1.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!muscleFat.weight) {
      muscleFat.weight =
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

function extractBodyAnalyseMetrics(text: string): MuscleFatAnalysis {
  const result: MuscleFatAnalysis = {};

  const weightOnCompositionLine = text.match(/\b(\d{2}[.,]\d)\s+2[.,]?5\s*[~\-–]\s*3/i);
  if (weightOnCompositionLine) {
    const value = parseNumber(weightOnCompositionLine[1]);
    if (value !== undefined && value >= 30 && value <= 200) {
      result.weight = value;
    }
  }

  if (!result.weight) {
    const weightBeforeRange = text.match(
      /([\d]{2}[.,]\d)\s[^\n]{0,30}(?:45[.,]?7\s*[~\-–]\s*61[.,]?8|457\s*[~\-–]\s*618)/i
    );
    if (weightBeforeRange) {
      const value = parseNumber(weightBeforeRange[1]);
      if (value !== undefined && value >= 30 && value <= 200) {
        result.weight = value;
      }
    }
  }

  const bodyFatMatch = text.match(
    /(?:boty|body|fat|gordura|bots)[^\d\n]{0,12}(\d{2,3}(?:[.,]\d+)?)[^\n]{0,20}(?:10[.,]?8\s*[~\-–]\s*17[.,]?2|108\s*[~\-–]\s*17[.,]?2|108\s*[~\-–]\s*172)/i
  );
  if (bodyFatMatch) {
    const value = normalizeOcrDecimal(parseNumber(bodyFatMatch[1])!, 80);
    if (value > 0 && value < 80) result.bodyFat = value;
  }

  const skeletalBeforeRange = text.match(
    /([\d]{2}[.,]\d|\d{1,2}\s+\d)\s[^\n]{0,30}(?:20[.,]?2\s*[~\-–]\s*24[.,]?7|202\s*[~\-–]\s*247)/i
  );
  if (skeletalBeforeRange) {
    const raw = skeletalBeforeRange[1].includes(' ')
      ? skeletalBeforeRange[1].replace(/\s+/, '.')
      : skeletalBeforeRange[1];
    const value = parseNumber(raw);
    if (value !== undefined && value >= 15 && value <= 60) {
      result.skeletalMuscle = value;
    }
  }

  if (!result.skeletalMuscle) {
    const skeletalInline = text.match(/\b(2[0-4][.,]\d)\b/);
    if (skeletalInline) {
      const value = parseNumber(skeletalInline[1]);
      if (value !== undefined && value >= 15 && value <= 60) {
        result.skeletalMuscle = value;
      }
    }
  }

  if (!result.skeletalMuscle) {
    const skeletalNearRange = text.match(
      /(?:skeletal|muscle|sevens|smm)[^\d\n]{0,20}(\d[\d?.,\s]{1,6})[^\n]{0,25}(?:20[.,]?2\s*[~\-–]\s*24[.,]?7|202\s*[~\-–]\s*247)/i
    );
    if (skeletalNearRange) {
      const value = parseGarbledDecimal(skeletalNearRange[1], 15, 60);
      if (value !== undefined) result.skeletalMuscle = value;
    }
  }

  return result;
}

function parseGarbledDecimal(raw: string, min: number, max: number): number | undefined {
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (!cleaned) return undefined;

  const direct = parseFloat(cleaned);
  if (Number.isFinite(direct) && direct >= min && direct <= max) return direct;
  if (Number.isFinite(direct) && direct > max && direct < max * 100) {
    const scaled = direct / 10;
    if (scaled >= min && scaled <= max) return scaled;
  }

  if (cleaned.length === 3) {
    const candidate = parseFloat(`${cleaned[0]}${cleaned[1]}.${cleaned[2]}`);
    if (candidate >= min && candidate <= max) return candidate;
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
  const rowPattern = new RegExp(
    `(?:^|\\n)\\s*${labelPattern}\\b[^\\n]{0,160}?([\\d]+[.,][\\d]+|[\\d]{2,3})\\s+(?:[\\d]+[.,][\\d]+\\s*)?[~\\-–]\\s*[\\d]`,
    'i'
  );
  const match = sectionText.match(rowPattern);
  if (!match) return undefined;

  let value = parseNumber(match[1]);
  if (value === undefined) return undefined;
  value = normalizeOcrDecimal(value, expectedMax);
  if (value > 0 && value < expectedMax) return value;
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
      let value = parseNumber(sameLine[1]);
      value = value !== undefined ? normalizeOcrDecimal(value, expectedMax) : undefined;
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
      let value = parseNumber(afterLabel[1]);
      value = value !== undefined ? normalizeOcrDecimal(value, expectedMax) : undefined;
      if (value !== undefined && value > 0 && value < expectedMax) return value;
    }

    for (let j = i + 1; j <= Math.min(i + 4, sectionLines.length - 1); j++) {
      const nextLine = sectionLines[j];
      if (excludeLabels.some((p) => p.test(nextLine))) continue;
      if (METRIC_MAPPINGS.some((m) => m.labels.some((p) => p.test(nextLine)))) break;
      if (/^[\d]+[.,][\d]+\s*[~\-–]\s*[\d]/i.test(nextLine)) continue;

      const numMatch =
        nextLine.match(/^([\d]+[.,][\d]+)\s*(?:kg|k9|%)?(?:\s|$|\()/i) ||
        nextLine.match(/^([\d]+[.,][\d]+)$/i) ||
        nextLine.match(/^([\d]{2,3})\s*(?:kg|k9|%)?(?:\s|$|\()/i);
      if (numMatch) {
        let value = parseNumber(numMatch[1]);
        value = value !== undefined ? normalizeOcrDecimal(value, expectedMax) : undefined;
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
