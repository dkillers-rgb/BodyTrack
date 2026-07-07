import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { ClientDashboard } from '../services/api';
import { loadCompanySettings } from '../services/companyStorage';
import { buildBodbodyReportHtml } from './bodbodyReportHtml';

const A4_WIDTH_PX = 794;

async function renderHtmlToCanvas(html: string): Promise<HTMLCanvasElement> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = `${A4_WIDTH_PX}px`;
  iframe.style.height = '1200px';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error('Não foi possível preparar o relatório para exportação.');
  }

  doc.open();
  doc.write(html);
  doc.close();

  await new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
    setTimeout(resolve, 400);
  });

  const target = doc.body;
  const canvas = await html2canvas(target, {
    scale: 2,
    useCORS: true,
    backgroundColor: null,
    logging: false,
    width: A4_WIDTH_PX,
    windowWidth: A4_WIDTH_PX,
  });

  document.body.removeChild(iframe);
  return canvas;
}

function addCanvasToPdf(pdf: jsPDF, canvas: HTMLCanvasElement): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
  const imgHeight = (canvas.height * usableWidth) / canvas.width;
  const imgData = canvas.toDataURL('image/png');

  if (imgHeight <= usableHeight) {
    pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, imgHeight);
    return;
  }

  let heightLeft = imgHeight;
  let position = margin;
  let page = 0;

  while (heightLeft > 0) {
    if (page > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
    heightLeft -= usableHeight;
    position -= usableHeight;
    page += 1;
  }
}

export async function exportDashboardToPdf(data: ClientDashboard, filename: string): Promise<void> {
  const company = loadCompanySettings();
  const html = buildBodbodyReportHtml(data, company, { theme: 'screen' });
  const canvas = await renderHtmlToCanvas(html);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addCanvasToPdf(pdf, canvas);
  pdf.save(filename);
}

export function printDashboardReport(data: ClientDashboard): void {
  const company = loadCompanySettings();
  const html = buildBodbodyReportHtml(data, company, { theme: 'print' });
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');
  if (!win) {
    throw new Error('Permita pop-ups para imprimir o relatório.');
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.onload = () => {
    win.print();
  };
}

/** @deprecated Use exportDashboardToPdf — captura de DOM quebra o layout do relatório. */
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#0B1720',
    logging: false,
    width: 900,
    windowWidth: 900,
  });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addCanvasToPdf(pdf, canvas);
  pdf.save(filename);
}
