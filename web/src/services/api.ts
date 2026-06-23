const API_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('bodytrack_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem('bodytrack_token');
    localStorage.removeItem('bodytrack_user');
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    const message =
      typeof error.error === 'string'
        ? error.error
        : typeof error.message === 'string'
          ? error.message
          : 'Erro na requisição';
    throw new Error(message);
  }

  if (response.status === 204) return {} as T;
  return response.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (name: string, email: string, password: string) =>
      request<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      }),
    me: () => request<User>('/auth/me'),
  },
  clients: {
    list: () => request<ClientWithMeta[]>('/clients'),
    get: (id: number) => request<ClientDetail>(`/clients/${id}`),
    create: (data: ClientInput) =>
      request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: ClientInput) =>
      request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/clients/${id}`, { method: 'DELETE' }),
  },
  evaluations: {
    list: () => request<Evaluation[]>('/evaluations'),
    byClient: (clientId: number) => request<Evaluation[]>(`/evaluations/client/${clientId}`),
    scanQr: (url: string) =>
      request<OcrPreview>('/evaluations/scan-qr', {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
    processImage: (file: File) => {
      const form = new FormData();
      form.append('image', file);
      return request<OcrPreview>('/evaluations/process-image', { method: 'POST', body: form });
    },
    create: (data: EvaluationInput) =>
      request<Evaluation>('/evaluations', { method: 'POST', body: JSON.stringify(data) }),
    autoSave: (clientId: number, file?: File, url?: string) => {
      const form = new FormData();
      form.append('clientId', String(clientId));
      if (file) form.append('image', file);
      if (url) form.append('url', url);
      return request<Evaluation>('/evaluations/auto-save', { method: 'POST', body: form });
    },
  },
  reports: {
    clientDashboard: (clientId: number) => request<ClientDashboard>(`/reports/client/${clientId}`),
    overview: () => request<Overview>('/reports/overview'),
  },
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Client {
  id: number;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  height: number;
  createdAt: string;
}

export interface ClientInput {
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  height: number;
}

export interface Evaluation {
  id: string;
  clientId: number;
  examDate: string;
  weight: number;
  skeletalMuscle: number;
  bodyFat: number;
  imagePath?: string;
  aiAnalysis?: string;
  client?: Client;
}

export interface EvaluationInput {
  clientId: number;
  examDate?: string;
  weight: number;
  skeletalMuscle: number;
  bodyFat: number;
  imagePath?: string;
  rawOcrText?: string;
}

export interface OcrPreview {
  imagePath: string;
  preview: {
    patient: {
      examDate?: string;
    };
    muscleFat: {
      weight?: number;
      skeletalMuscle?: number;
      bodyFat?: number;
    };
  };
  ocr: { rawText: string };
}

export interface ClientWithMeta extends Client {
  _count: { evaluations: number };
  evaluations: Evaluation[];
}

export interface ClientDetail extends Client {
  evaluations: Evaluation[];
}

export interface ChartPoint {
  date: string;
  weight: number;
  skeletalMuscle: number;
  bodyFat: number;
}

export interface ClientDashboard {
  client: Client;
  evaluations: Evaluation[];
  chartData: ChartPoint[];
  analysis: string;
  summary: {
    totalEvaluations: number;
    latestWeight?: number;
    latestMuscle?: number;
    latestFat?: number;
    firstExam?: string;
    lastExam?: string;
  };
}

export interface Overview {
  totalClients: number;
  totalEvaluations: number;
  recentEvaluations: (Evaluation & { client: { id: number; name: string } })[];
}
