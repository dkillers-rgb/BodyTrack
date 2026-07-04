import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { companyRepo } from '../db/repository';
import { readLocalFileAsDataUri } from '../services/fileStorage';
import type { ClientDashboard, CompanySettings } from '../services/types';
import { buildBodbodyReportHtml } from './bodbodyReportHtml';

async function loadCompanyForReport(): Promise<CompanySettings> {
  const company = await companyRepo.get();
  if (!company.logoPath) return company;
  const logoDataUri = await readLocalFileAsDataUri(company.logoPath);
  return { ...company, logoDataUri };
}

export async function exportReportToPdf(data: ClientDashboard): Promise<void> {
  const company = await loadCompanyForReport();
  const html = buildBodbodyReportHtml(data, company);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const slug = data.client.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `relatorio-${slug || 'cliente'}.pdf`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    throw new Error('Compartilhamento não disponível neste dispositivo');
  }
}

export async function printReport(data: ClientDashboard): Promise<void> {
  const company = await loadCompanyForReport();
  const html = buildBodbodyReportHtml(data, company);
  await Print.printAsync({ html });
}
