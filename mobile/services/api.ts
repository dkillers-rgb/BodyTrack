import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getLocalApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001/api';
  }
  return 'http://localhost:3001/api';
};

const API_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  Constants.manifest?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  getLocalApiUrl();

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

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
  },
  clients: {
    list: () => request<Client[]>('/clients'),
    get: (id: number) => request<ClientDetail>(`/clients/${id}`),
    update: (id: number, data: ClientInput) =>
      request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  evaluations: {
    scanQr: (url: string) =>
      request<OcrPreview>('/evaluations/scan-qr', {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
    processImage: (formData: FormData) =>
      request<OcrPreview>('/evaluations/process-image', { method: 'POST', body: formData }),
    create: (data: EvaluationInput) =>
      request<Evaluation>('/evaluations', { method: 'POST', body: JSON.stringify(data) }),
    autoSave: (clientId: number, formData: FormData) => {
      formData.append('clientId', String(clientId));
      return request<Evaluation>('/evaluations/auto-save', { method: 'POST', body: formData });
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
}

export interface Client {
  id: number;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  height: number;
}

export interface ClientInput {
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  height: number;
}

export interface ClientDetail extends Client {
  evaluations: Evaluation[];
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

export interface ClientDashboard {
  client: Client;
  chartData: { date: string; weight: number; skeletalMuscle: number; bodyFat: number }[];
  analysis: string;
  summary: Record<string, unknown>;
}

export interface Overview {
  totalClients: number;
  totalEvaluations: number;
  recentEvaluations: Evaluation[];
}
