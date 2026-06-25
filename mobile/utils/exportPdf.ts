import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { ClientDashboard } from '../services/types';
import { buildReportHtml } from './reportHtml';

export async function exportReportToPdf(data: ClientDashboard): Promise<void> {
  const html = buildReportHtml(data);
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
  const html = buildReportHtml(data);
  await Print.printAsync({ html });
}
