import jsPDF from 'jspdf';

/**
 * Download an array of rows as a simple table PDF (A4 landscape).
 * @param filenameBase file name without extension (a date stamp is appended)
 * @param title heading printed at the top of the document
 * @param columns ordered list of [header label, row accessor]
 */
export function downloadPdf<T>(
  filenameBase: string,
  title: string,
  columns: Array<[string, (row: T) => unknown]>,
  rows: T[],
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 32;
  const tableWidth = pageWidth - margin * 2;
  const colWidth = tableWidth / columns.length;
  const rowHeight = 20;
  const stamp = new Date().toISOString().slice(0, 10);

  const cell = (value: unknown) => {
    const str = value === null || value === undefined ? '' : String(value);
    return doc.splitTextToSize(str, colWidth - 10)[0] ?? '';
  };

  let y = margin;

  const drawHeader = () => {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("Nosty'$ Fresh Fast Food", margin, y + 4);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${title} — ${stamp}`, margin, y + 22);
    y += 44;

    doc.setFillColor(200, 30, 30);
    doc.rect(margin, y, tableWidth, rowHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    columns.forEach(([label], i) => {
      doc.text(cell(label), margin + i * colWidth + 5, y + 14);
    });
    y += rowHeight;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
  };

  drawHeader();

  rows.forEach((row, index) => {
    if (y + rowHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeader();
    }
    if (index % 2 === 1) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, tableWidth, rowHeight, 'F');
    }
    columns.forEach(([, get], i) => {
      doc.text(cell(get(row)), margin + i * colWidth + 5, y + 14);
    });
    y += rowHeight;
  });

  doc.save(`${filenameBase}-${stamp}.pdf`);
}
