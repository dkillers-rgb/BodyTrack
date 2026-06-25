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
  rawOcrText?: string;
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
  imagePath?: string;
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
}

export interface Overview {
  totalClients: number;
  totalEvaluations: number;
  recentEvaluations: Evaluation[];
}
