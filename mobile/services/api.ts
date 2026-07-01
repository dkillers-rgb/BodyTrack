import { clientsRepo, evaluationsRepo, reportsRepo } from '../db/repository';
import { saveFromUri } from './fileStorage';
import { processReportFile, toOcrPreview } from './ocrService';
import { processQrCodeUrl } from './reportApiService';
import type {
  Client,
  ClientDashboard,
  ClientDetail,
  ClientInput,
  Evaluation,
  EvaluationInput,
  OcrPreview,
  Overview,
  User,
} from './types';

export type {
  Client,
  ClientDashboard,
  ClientDetail,
  ClientInput,
  Evaluation,
  EvaluationInput,
  OcrPreview,
  Overview,
  User,
} from './types';

/** Mantido por compatibilidade — autenticação local não usa token. */
export function setToken(_token: string | null) {}

export const api = {
  auth: {
    login: async (_email: string, _password: string) => {
      throw new Error('Login não disponível no modo offline');
    },
    register: async (_name: string, _email: string, _password: string) => {
      throw new Error('Registro não disponível no modo offline');
    },
  },
  clients: {
    list: () => clientsRepo.list(),
    get: async (id: number) => {
      const client = await clientsRepo.get(id);
      if (!client) throw new Error('Cliente não encontrado');
      return client as ClientDetail;
    },
    create: (data: ClientInput) => clientsRepo.create(data),
    update: (id: number, data: ClientInput) => clientsRepo.update(id, data),
    delete: (id: number) => clientsRepo.delete(id),
  },
  evaluations: {
    /** Requer internet: extrai key do QR e consulta a API BodyTrack. */
    scanQr: async (url: string): Promise<OcrPreview> => {
      if (!url?.trim()) throw new Error('URL do relatório é obrigatória');
      return processQrCodeUrl(url);
    },
    /** Offline: copia o arquivo para o armazenamento local e roda OCR (imagens). */
    processImage: async (
      uri: string,
      mimeType?: string,
      fileName?: string
    ): Promise<OcrPreview> => {
      const relativePath = await saveFromUri(uri, mimeType, fileName);
      const ocr = await processReportFile(relativePath, mimeType);
      const preview = toOcrPreview(relativePath, ocr);

      const isPdf =
        mimeType === 'application/pdf' || relativePath.toLowerCase().endsWith('.pdf');
      if (isPdf && !ocr.rawText) {
        preview.ocr.rawText =
          'PDF salvo localmente. Preencha os dados manualmente (OCR automático disponível para imagens).';
      }

      return preview;
    },
    create: (data: EvaluationInput) => evaluationsRepo.create(data),
  },
  reports: {
    clientDashboard: (clientId: number) => reportsRepo.clientDashboard(clientId),
    overview: () => reportsRepo.overview(),
  },
};
