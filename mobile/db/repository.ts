import { getDatabase } from './database';
import { generateLocalAnalysis } from '../services/analysisService';
import { buildBodbodyReportFromEvaluation } from '../services/bodbodyReportMapper';
import { findNamedNumeric } from '../services/tcyReportMapper';
import type {
  Client,
  ClientDetail,
  ClientDashboard,
  ClientInput,
  CompanySettings,
  CompanySettingsInput,
  Evaluation,
  EvaluationInput,
  Overview,
} from '../services/types';

type ClientRow = {
  id: number;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  height: number;
  phone: string | null;
  external_id: string | null;
};

type EvaluationRow = {
  id: string;
  client_id: number;
  exam_date: string;
  weight: number;
  skeletal_muscle: number;
  body_fat: number;
  visceral_fat: number | null;
  image_path: string | null;
  raw_ocr_text: string | null;
  ai_analysis: string | null;
  raw_report_json: string | null;
};

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    externalId: row.external_id?.trim() || String(row.id),
    name: row.name,
    gender: row.gender,
    age: row.age,
    height: row.height,
    phone: row.phone?.trim() || undefined,
  };
}

function normalizeExternalId(externalId: string): string {
  return externalId.trim();
}

async function assertExternalIdUnique(
  db: Awaited<ReturnType<typeof getDatabase>>,
  externalId: string,
  excludeClientId?: number
): Promise<void> {
  const normalized = normalizeExternalId(externalId).toLowerCase();
  const params: (string | number)[] = [normalized, externalId];
  let sql = `
    SELECT id FROM clients
    WHERE (
      (external_id IS NOT NULL AND TRIM(external_id) != '' AND LOWER(TRIM(external_id)) = ?)
      OR ((external_id IS NULL OR TRIM(external_id) = '') AND CAST(id AS TEXT) = ?)
    )
  `;

  if (excludeClientId != null) {
    sql += ' AND id != ?';
    params.push(excludeClientId);
  }

  const existing = await db.getFirstAsync<{ id: number }>(sql, params);
  if (existing) {
    throw new Error('Já existe um cliente com este ID.');
  }
}

function normalizePhone(phone?: string): string | null {
  const trimmed = phone?.trim();
  return trimmed ? trimmed : null;
}

function mapEvaluation(row: EvaluationRow, client?: Client): Evaluation {
  return {
    id: row.id,
    clientId: row.client_id,
    examDate: row.exam_date,
    weight: row.weight,
    skeletalMuscle: row.skeletal_muscle,
    bodyFat: row.body_fat,
    visceralFat: row.visceral_fat ?? undefined,
    imagePath: row.image_path || undefined,
    rawOcrText: row.raw_ocr_text || undefined,
    rawReportJson: row.raw_report_json || undefined,
    aiAnalysis: row.ai_analysis || undefined,
    client,
  };
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function refreshClientAnalysis(clientId: number): Promise<void> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<EvaluationRow>(
    'SELECT * FROM evaluations WHERE client_id = ? ORDER BY exam_date ASC',
    [clientId]
  );

  if (rows.length === 0) return;

  const analysis = generateLocalAnalysis(
    rows.map((r) => ({
      examDate: new Date(r.exam_date),
      weight: r.weight,
      skeletalMuscle: r.skeletal_muscle,
      bodyFat: r.body_fat,
    }))
  );

  const latest = rows[rows.length - 1];
  await db.runAsync('UPDATE evaluations SET ai_analysis = ? WHERE id = ?', [analysis, latest.id]);
}

export const clientsRepo = {
  async list(): Promise<Client[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ClientRow>('SELECT * FROM clients ORDER BY id ASC');
    return rows.map(mapClient);
  },

  async get(id: number): Promise<ClientDetail | null> {
    const db = await getDatabase();
    const client = await db.getFirstAsync<ClientRow>('SELECT * FROM clients WHERE id = ?', [id]);
    if (!client) return null;

    const evalRows = await db.getAllAsync<EvaluationRow>(
      'SELECT * FROM evaluations WHERE client_id = ? ORDER BY exam_date ASC',
      [id]
    );

    const mappedClient = mapClient(client);
    return {
      ...mappedClient,
      evaluations: evalRows.map((r) => mapEvaluation(r, mappedClient)),
    };
  },

  async create(data: ClientInput): Promise<Client> {
    const externalId = normalizeExternalId(data.externalId);
    if (!externalId) throw new Error('Informe o ID do cliente.');

    const db = await getDatabase();
    await assertExternalIdUnique(db, externalId);

    const now = new Date().toISOString();
    const result = await db.runAsync(
      `INSERT INTO clients (external_id, name, gender, age, height, phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [externalId, data.name.trim(), data.gender, data.age, data.height, normalizePhone(data.phone), now, now]
    );

    const id = result.lastInsertRowId;
    const row = await db.getFirstAsync<ClientRow>('SELECT * FROM clients WHERE id = ?', [id]);
    if (!row) throw new Error('Falha ao criar cliente');
    return mapClient(row);
  },

  async update(id: number, data: ClientInput): Promise<Client> {
    const externalId = normalizeExternalId(data.externalId);
    if (!externalId) throw new Error('Informe o ID do cliente.');

    const db = await getDatabase();
    await assertExternalIdUnique(db, externalId, id);

    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE clients SET external_id = ?, name = ?, gender = ?, age = ?, height = ?, phone = ?, updated_at = ? WHERE id = ?`,
      [externalId, data.name.trim(), data.gender, data.age, data.height, normalizePhone(data.phone), now, id]
    );

    const row = await db.getFirstAsync<ClientRow>('SELECT * FROM clients WHERE id = ?', [id]);
    if (!row) throw new Error('Cliente não encontrado');
    return mapClient(row);
  },

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM evaluations WHERE client_id = ?', [id]);
    await db.runAsync('DELETE FROM clients WHERE id = ?', [id]);
  },
};

export const evaluationsRepo = {
  async create(data: EvaluationInput): Promise<Evaluation> {
    const db = await getDatabase();
    const client = await db.getFirstAsync<ClientRow>('SELECT * FROM clients WHERE id = ?', [
      data.clientId,
    ]);
    if (!client) throw new Error('Cliente não encontrado');

    const id = newId();
    const examDate = data.examDate || new Date().toISOString();

    // If bodyAge provided without rawReportJson, synthesize a minimal rawReportJson so mapper can validate/use it.
    let rawReportJsonToSave: string | undefined = data.rawReportJson ?? undefined;
    if (!rawReportJsonToSave && data.bodyAge != null) {
      try {
        rawReportJsonToSave = JSON.stringify({
          section2: {
            weight: data.weight,
            skeletalMuscle: data.skeletalMuscle,
            bodyFat: data.bodyFat,
            visceralFat: data.visceralFat ?? null,
          },
          section6: { bodyAge: data.bodyAge },
        });
      } catch {
        rawReportJsonToSave = undefined;
      }
    }

    // Ensure that if bodyAge is provided we inject it into the rawReportJson so validator sees it.
    if (rawReportJsonToSave && data.bodyAge != null) {
      try {
        const parsed = JSON.parse(rawReportJsonToSave) as any;
        if (parsed != null && typeof parsed === 'object') {
          parsed.section6 = { ...(parsed.section6 || {}), bodyAge: data.bodyAge };
          rawReportJsonToSave = JSON.stringify(parsed);
        } else {
          rawReportJsonToSave = JSON.stringify({
            section2: {
              weight: data.weight,
              skeletalMuscle: data.skeletalMuscle,
              bodyFat: data.bodyFat,
              visceralFat: data.visceralFat ?? null,
            },
            section6: { bodyAge: data.bodyAge },
          });
        }
      } catch {
        rawReportJsonToSave = JSON.stringify({
          section2: {
            weight: data.weight,
            skeletalMuscle: data.skeletalMuscle,
            bodyFat: data.bodyFat,
            visceralFat: data.visceralFat ?? null,
          },
          section6: { bodyAge: data.bodyAge },
        });
      }
    }

    // Validate that if there's a raw report JSON (real or synthesized) it contains Body Age (required)
    if (rawReportJsonToSave) {
      const mappedClient = mapClient(client);
      // buildBodbodyReportFromEvaluation will throw if Body Age is required and missing
      buildBodbodyReportFromEvaluation(
        mappedClient,
        {
          examDate: examDate,
          weight: data.weight,
          skeletalMuscle: data.skeletalMuscle,
          bodyFat: data.bodyFat,
          visceralFat: data.visceralFat,
        },
        rawReportJsonToSave
      );
    }

    await db.runAsync(
      `INSERT INTO evaluations
        (id, client_id, exam_date, weight, skeletal_muscle, body_fat, visceral_fat, image_path, raw_ocr_text, raw_report_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.clientId,
        examDate,
        data.weight,
        data.skeletalMuscle,
        data.bodyFat,
        data.visceralFat ?? null,
        data.imagePath || null,
        data.rawOcrText || null,
        rawReportJsonToSave || null,
      ]
    );

    await refreshClientAnalysis(data.clientId);

    const row = await db.getFirstAsync<EvaluationRow>(
      'SELECT * FROM evaluations WHERE id = ?',
      [id]
    );
    if (!row) throw new Error('Falha ao salvar avaliação');
    // Ensure the saved row contains bodyAge in raw_report_json when provided
    try {
      if (data.bodyAge != null) {
        let parsed: any = null;
        if (row.raw_report_json) {
          try {
            parsed = JSON.parse(row.raw_report_json);
          } catch {
            parsed = null;
          }
        }
        if (!parsed) {
          parsed = {
            section2: {
              weight: data.weight,
              skeletalMuscle: data.skeletalMuscle,
              bodyFat: data.bodyFat,
              visceralFat: data.visceralFat ?? null,
            },
            section6: { bodyAge: data.bodyAge },
          };
        } else {
          parsed.section6 = { ...(parsed.section6 || {}), bodyAge: data.bodyAge };
        }
        const updatedJson = JSON.stringify(parsed);
        if (updatedJson !== row.raw_report_json) {
          await db.runAsync('UPDATE evaluations SET raw_report_json = ? WHERE id = ?', [updatedJson, id]);
        }
      }
    } catch {
      // ignore update errors
    }
    return mapEvaluation(row, mapClient(client));
  },
};

type CompanyRow = {
  id: number;
  name: string;
  address: string;
  phone: string;
  logo_path: string | null;
};

function mapCompany(row: CompanyRow): CompanySettings {
  return {
    name: row.name ?? '',
    address: row.address ?? '',
    phone: row.phone ?? '',
    logoPath: row.logo_path || undefined,
  };
}

export const companyRepo = {
  async get(): Promise<CompanySettings> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<CompanyRow>('SELECT * FROM company_settings WHERE id = 1');
    if (!row) {
      return { name: '', address: '', phone: '' };
    }
    return mapCompany(row);
  },

  async save(data: CompanySettingsInput): Promise<CompanySettings> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const logoPath =
      data.logoPath === null ? null : data.logoPath !== undefined ? data.logoPath : undefined;

    if (logoPath === undefined) {
      await db.runAsync(
        `UPDATE company_settings
         SET name = ?, address = ?, phone = ?, updated_at = ?
         WHERE id = 1`,
        [data.name.trim(), data.address.trim(), data.phone.trim(), now]
      );
    } else {
      await db.runAsync(
        `UPDATE company_settings
         SET name = ?, address = ?, phone = ?, logo_path = ?, updated_at = ?
         WHERE id = 1`,
        [data.name.trim(), data.address.trim(), data.phone.trim(), logoPath, now]
      );
    }

    return companyRepo.get();
  },
};

export const reportsRepo = {
  async overview(): Promise<Overview> {
    const db = await getDatabase();
    const totalClients = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM clients'
    );
    const totalEvaluations = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM evaluations'
    );

    const recentRows = await db.getAllAsync<EvaluationRow & { client_name: string }>(
      `SELECT e.*, c.name as client_name
       FROM evaluations e
       JOIN clients c ON c.id = e.client_id
       ORDER BY e.exam_date DESC
       LIMIT 10`
    );

    return {
      totalClients: totalClients?.count ?? 0,
      totalEvaluations: totalEvaluations?.count ?? 0,
      recentEvaluations: recentRows.map((r) =>
        mapEvaluation(r, {
          id: r.client_id,
          externalId: String(r.client_id),
          name: r.client_name,
          gender: 'MALE',
          age: 0,
          height: 0,
        })
      ),
    };
  },

  /** Última avaliação de cada cliente (para badges em Relatórios). */
  async latestByClient(): Promise<Record<number, Evaluation>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<EvaluationRow>(
      `SELECT e.*
       FROM evaluations e
       INNER JOIN (
         SELECT client_id, MAX(exam_date) AS max_date
         FROM evaluations
         GROUP BY client_id
       ) latest ON latest.client_id = e.client_id AND latest.max_date = e.exam_date`
    );
    const map: Record<number, Evaluation> = {};
    for (const row of rows) {
      map[row.client_id] = mapEvaluation(row);
    }
    return map;
  },

  async clientDashboard(clientId: number): Promise<ClientDashboard> {
    const detail = await clientsRepo.get(clientId);
    if (!detail) throw new Error('Cliente não encontrado');

    const chartData = detail.evaluations.map((e) => ({
      date: e.examDate.split('T')[0],
      weight: e.weight,
      skeletalMuscle: e.skeletalMuscle,
      bodyFat: e.bodyFat,
    }));

    const latest = detail.evaluations[detail.evaluations.length - 1];
    const analysis =
      latest?.aiAnalysis ||
      generateLocalAnalysis(
        detail.evaluations.map((e) => ({
          examDate: new Date(e.examDate),
          weight: e.weight,
          skeletalMuscle: e.skeletalMuscle,
          bodyFat: e.bodyFat,
        }))
      );

    const bodbodyReport = latest
      ? buildBodbodyReportFromEvaluation(
          {
            id: detail.id,
            externalId: detail.externalId,
            name: detail.name,
            gender: detail.gender,
            age: detail.age,
            height: detail.height,
          },
          latest,
          latest.rawReportJson
        )
      : undefined;

    // If bodyAge still missing in the normalized snapshot, try to extract from rawReportJson
    if (bodbodyReport && !(bodbodyReport.section6 && typeof bodbodyReport.section6.bodyAge === 'number')) {
      try {
        const raw = latest?.rawReportJson;
        if (raw) {
          const found = findNamedNumeric(raw, ['Body Age', 'BodyAge', 'Idade', 'Age', 'idade', 'idade corporal', 'body_age', 'idade_corporal', 'idade_anos', 'age_years', 'idade (anos)']);
          if (found != null && Number.isFinite(found)) {
            bodbodyReport.section6 = { ...(bodbodyReport.section6 || {}), bodyAge: Math.round(found) } as any;
          }
        }
      } catch {
        // ignore extraction errors
      }
    }

    return {
      client: {
        id: detail.id,
        externalId: detail.externalId,
        name: detail.name,
        gender: detail.gender,
        age: detail.age,
        height: detail.height,
        phone: detail.phone,
      },
      evaluations: detail.evaluations,
      chartData,
      analysis,
      bodbodyReport,
      summary: {
        totalEvaluations: detail.evaluations.length,
        latestWeight: latest?.weight,
        latestMuscle: latest?.skeletalMuscle,
        latestFat: latest?.bodyFat,
        firstExam: detail.evaluations[0]?.examDate,
        lastExam: latest?.examDate,
      },
    };
  },
};
