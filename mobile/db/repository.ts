import { getDatabase } from './database';
import { generateLocalAnalysis } from '../services/analysisService';
import type {
  Client,
  ClientDetail,
  ClientDashboard,
  ClientInput,
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
};

type EvaluationRow = {
  id: string;
  client_id: number;
  exam_date: string;
  weight: number;
  skeletal_muscle: number;
  body_fat: number;
  image_path: string | null;
  raw_ocr_text: string | null;
  ai_analysis: string | null;
};

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    age: row.age,
    height: row.height,
  };
}

function mapEvaluation(row: EvaluationRow, client?: Client): Evaluation {
  return {
    id: row.id,
    clientId: row.client_id,
    examDate: row.exam_date,
    weight: row.weight,
    skeletalMuscle: row.skeletal_muscle,
    bodyFat: row.body_fat,
    imagePath: row.image_path || undefined,
    rawOcrText: row.raw_ocr_text || undefined,
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
    const db = await getDatabase();
    const now = new Date().toISOString();
    const result = await db.runAsync(
      `INSERT INTO clients (name, gender, age, height, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.name.trim(), data.gender, data.age, data.height, now, now]
    );

    const id = result.lastInsertRowId;
    const row = await db.getFirstAsync<ClientRow>('SELECT * FROM clients WHERE id = ?', [id]);
    if (!row) throw new Error('Falha ao criar cliente');
    return mapClient(row);
  },

  async update(id: number, data: ClientInput): Promise<Client> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE clients SET name = ?, gender = ?, age = ?, height = ?, updated_at = ? WHERE id = ?`,
      [data.name.trim(), data.gender, data.age, data.height, now, id]
    );

    const row = await db.getFirstAsync<ClientRow>('SELECT * FROM clients WHERE id = ?', [id]);
    if (!row) throw new Error('Cliente não encontrado');
    return mapClient(row);
  },

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
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

    await db.runAsync(
      `INSERT INTO evaluations
        (id, client_id, exam_date, weight, skeletal_muscle, body_fat, image_path, raw_ocr_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.clientId,
        examDate,
        data.weight,
        data.skeletalMuscle,
        data.bodyFat,
        data.imagePath || null,
        data.rawOcrText || null,
      ]
    );

    await refreshClientAnalysis(data.clientId);

    const row = await db.getFirstAsync<EvaluationRow>(
      'SELECT * FROM evaluations WHERE id = ?',
      [id]
    );
    if (!row) throw new Error('Falha ao salvar avaliação');
    return mapEvaluation(row, mapClient(client));
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
          name: r.client_name,
          gender: 'MALE',
          age: 0,
          height: 0,
        })
      ),
    };
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

    return {
      client: {
        id: detail.id,
        name: detail.name,
        gender: detail.gender,
        age: detail.age,
        height: detail.height,
      },
      evaluations: detail.evaluations,
      chartData,
      analysis,
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
