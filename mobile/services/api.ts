import { clientsRepo, companyRepo, evaluationsRepo, reportsRepo } from '../db/repository';
import { saveCompanyLogo, saveFromUri } from './fileStorage';
import { processReportFile, toOcrPreview } from './ocrService';
import { processQrCodeUrl } from './reportApiService';
import type {
  Client,
  ClientDashboard,
  ClientDetail,
  ClientInput,
  CompanySettings,
  CompanySettingsInput,
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
  CompanySettings,
  CompanySettingsInput,
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
    /**
     * Guarda o arquivo localmente.
     * OCR só corre se `runOcr` for true (pesado — sob pedido).
     */
    processImage: async (
      uri: string,
      mimeType?: string,
      fileName?: string,
      options?: { runOcr?: boolean }
    ): Promise<OcrPreview> => {
      const relativePath = await saveFromUri(uri, mimeType, fileName);
      const runOcr = options?.runOcr === true;
      if (!runOcr) {
        return {
          imagePath: relativePath,
          preview: {
            patient: {},
            muscleFat: {},
          },
          ocr: {
            rawText:
              'Arquivo guardado. OCR não executado — preencha os dados ou chame processImage com runOcr: true.',
          },
        };
      }

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
    latestByClient: () => reportsRepo.latestByClient(),
  },
  company: {
    get: () => companyRepo.get(),
    save: (data: CompanySettingsInput) => companyRepo.save(data),
    saveLogo: async (uri: string, mimeType?: string, fileName?: string): Promise<CompanySettings> => {
      const logoPath = await saveCompanyLogo(uri, mimeType, fileName);
      const current = await companyRepo.get();
      return companyRepo.save({
        name: current.name,
        address: current.address,
        phone: current.phone,
        logoPath,
      });
    },
  },
};
