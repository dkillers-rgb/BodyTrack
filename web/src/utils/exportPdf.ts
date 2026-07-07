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

function writeHtmlDocument(target: Document, html: string): void {
  target.open();
  target.write(html);
  target.close();
}

function printHtmlDocument(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Impressão do relatório');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    document.body.removeChild(iframe);
    openPrintWithBlobUrl(html);
    return;
  }

  writeHtmlDocument(doc, html);

  const cleanup = () => {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  };

  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      cleanup();
      openPrintWithBlobUrl(html);
      return;
    }

    win.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 60_000);
  };

  setTimeout(triggerPrint, 350);
}

function openPrintWithBlobUrl(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');

  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error('Não foi possível abrir a impressão. Permita pop-ups ou use Exportar PDF.');
  }

  const revoke = () => URL.revokeObjectURL(url);
  win.addEventListener('load', () => {
    try {
      win.focus();
      win.print();
    } finally {
      revoke();
    }
  }, { once: true });

  setTimeout(revoke, 120_000);
}

export function printDashboardReport(data: ClientDashboard): void {
  const company = loadCompanySettings();
  const html = buildBodbodyReportHtml(data, company, { theme: 'print' });
  printHtmlDocument(html);
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
