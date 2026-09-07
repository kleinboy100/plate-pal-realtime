function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * Download an array of rows as a CSV file.
 * @param filenameBase file name without extension (a date stamp is appended)
 * @param columns ordered list of [header label, row accessor]
 */
export function downloadCsv<T>(
  filenameBase: string,
  columns: Array<[string, (row: T) => unknown]>,
  rows: T[],
) {
  const header = columns.map(([label]) => escapeCell(label)).join(',');
  const body = rows.map(row => columns.map(([, get]) => escapeCell(get(row))).join(','));
  const csv = [header, ...body].join('\r\n');

  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenameBase}-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
