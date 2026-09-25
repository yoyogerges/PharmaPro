export interface CsvColumn {
  key: string;
  label: string;
}

export function rowsToCsv(columns: CsvColumn[], rows: Array<Record<string, unknown>>): string {
  const header = columns.map((c) => `"${c.label}"`).join(',');
  const lines = rows.map((row) => columns.map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(','));
  return `\uFEFF${header}\n${lines.join('\n')}`;
}