import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const imgElements = Array.from(element.querySelectorAll('img')); 
  await Promise.all(
    imgElements.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          }
        })
    )
  );
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
  const imgHeight = (canvas.height * usableWidth) / canvas.width;
  const imgData = canvas.toDataURL('image/png');
  const scale = imgHeight > usableHeight ? usableHeight / imgHeight : 1;
  const drawWidth = usableWidth * scale;
  const drawHeight = imgHeight * scale;
  const x = margin + (usableWidth - drawWidth) / 2;
  const y = margin;

  pdf.addImage(imgData, 'PNG', x, y, drawWidth, drawHeight);

  pdf.save(filename);
}
