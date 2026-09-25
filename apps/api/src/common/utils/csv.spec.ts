import { rowsToCsv } from './csv';

describe('rowsToCsv', () => {
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
  ];

  it('emits a BOM and a header row', () => {
    const csv = rowsToCsv(columns, []);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"ID","Name"');
  });

  it('escapes quotes inside fields', () => {
    const csv = rowsToCsv(columns, [{ id: '1', name: 'Say "Hi"' }]);
    expect(csv).toContain('"Say ""Hi"""');
  });

  it('serializes numbers and converts undefined to empty string', () => {
    const csv = rowsToCsv(columns, [{ id: 42, name: undefined }]);
    const line = csv.split('\n')[1];
    expect(line).toBe('"42",""');
  });

  it('produces one line per row', () => {
    const csv = rowsToCsv(columns, [
      { id: 'a', name: 'X' },
      { id: 'b', name: 'Y' },
    ]);
    expect(csv.split('\n').filter(Boolean).length).toBe(3);
  });
});