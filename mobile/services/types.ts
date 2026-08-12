export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
}

export interface Client {
  id: number;
  /** ID informado manualmente pelo usuário */
  externalId: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  height: number;
  phone?: string;
}

export interface ClientInput {
  externalId: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  height: number;
  phone?: string;
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
  visceralFat?: number;
  imagePath?: string;
  aiAnalysis?: string;
  rawOcrText?: string;
  rawReportJson?: string;
  client?: Client;
}

export interface EvaluationInput {
  clientId: number;
  examDate?: string;
  weight: number;
  skeletalMuscle: number;
  bodyFat: number;
  visceralFat?: number;
  bodyAge?: number;
  imagePath?: string;
  rawOcrText?: string;
  rawReportJson?: string;
}

import type { BodbodyReportSnapshot } from './bodbodyReportTypes';

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
  ocr: { rawText: string };
  rawCodeValue?: string;
  bodbodyReport?: BodbodyReportSnapshot;
}

/** Dados retornados por GET /report?key= (apenas composição corporal) */
export interface ReportData {
  peso: number;
  massaMuscularEsqueletica: number;
  gorduraCorporal: number;
  gorduraVisceral?: number;
}

export interface ChartPoint {
  date: string;
  weight: number;
  skeletalMuscle: number;
  bodyFat: number;
}

export interface ClientDashboardSummary {
  totalEvaluations: number;
  latestWeight?: number;
  latestMuscle?: number;
  latestFat?: number;
  firstExam?: string;
  lastExam?: string;
}

export interface ClientDashboard {
  client: Client;
  evaluations: Evaluation[];
  chartData: ChartPoint[];
  analysis: string;
  summary: ClientDashboardSummary;
  bodbodyReport?: BodbodyReportSnapshot;
}

export interface Overview {
  totalClients: number;
  totalEvaluations: number;
  recentEvaluations: Evaluation[];
}

export interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  /** Caminho relativo no armazenamento local (ex.: company/logo.png) */
  logoPath?: string;
  /** Data URI da logo para embutir no PDF/HTML */
  logoDataUri?: string;
}

export interface CompanySettingsInput {
  name: string;
  address: string;
  phone: string;
  logoPath?: string | null;
}
