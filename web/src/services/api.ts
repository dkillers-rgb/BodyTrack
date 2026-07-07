const apiPort = import.meta.env.VITE_API_PORT || '3001';

function isPrivateLanHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function resolveApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL as string | undefined;

  if (configured && configured !== '/api') {
    const trimmed = configured.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }

  if (typeof window === 'undefined') {
    return '/api';
  }

  const { protocol, hostname, port } = window.location;

  if (protocol === 'file:' || !hostname) {
    return `http://127.0.0.1:${apiPort}/api`;
  }

  if (hostname.includes('vercel.app')) {
    return 'https://bodytrack-ph0z.onrender.com/api';
  }

  const onViteDev = port === '5173' || port === '4173';
  const onLan = isPrivateLanHost(hostname) && !isLoopbackHost(hostname);

  // Dev/preview Vite: sempre proxy /api (mesma origem — evita bloqueio da porta 3001 no celular).
  if (onViteDev) {
    return '/api';
  }

  // HTTP na rede local sem Vite (build estático): backend direto no IP do PC.
  if (protocol === 'http:' && onLan) {
    return `http://${hostname}:${apiPort}/api`;
  }

  if (protocol === 'https:' && onLan) {
    return '/api';
  }

  if (isLoopbackHost(hostname)) {
    return `http://127.0.0.1:${apiPort}/api`;
  }

  return '/api';
}

const API_URL = resolveApiUrl();

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${normalizedPath}`, { ...options, headers });
  } catch {
    throw new Error(
      'Sem conexão com o servidor. Confirme que o backend está rodando no PC (npm run dev no backend).'
    );
  }

  if (response.status === 401) {
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
  externalId: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  height: number;
  phone?: string;
  createdAt: string;
}

export interface ClientInput {
  externalId: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  height: number;
  phone?: string;
}

export interface Evaluation {
  id: string;
  clientId: number;
  examDate: string;
  weight: number;
  skeletalMuscle: number;
  bodyFat: number;
  visceralFat?: number;
  imagePath?: string;
  rawOcrText?: string;
  rawReportJson?: string;
  aiAnalysis?: string;
  client?: Client;
}

export interface EvaluationInput {
  clientId: number;
  examDate?: string;
  weight: number;
  skeletalMuscle: number;
  bodyFat: number;
  visceralFat?: number;
  imagePath?: string;
  rawOcrText?: string;
  rawReportJson?: string;
}

export interface OcrPreview {
  imagePath?: string;
  preview: {
    patient: {
      examDate?: string;
    };
    muscleFat: {
      weight?: number;
      skeletalMuscle?: number;
      bodyFat?: number;
      visceralFat?: number;
    };
  };
  bodbodyReport?: import('../types/bodbodyReportTypes').BodbodyReportSnapshot;
  rawCodeValue?: string;
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
  bodbodyReport?: import('../types/bodbodyReportTypes').BodbodyReportSnapshot;
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
