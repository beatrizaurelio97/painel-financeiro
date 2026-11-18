import type { CellValue, Row, Workbook, Worksheet } from 'exceljs';
import { CATEGORIES } from '../models/category.model';
import { ReportGroup, Transaction, YearlyReport } from '../models/transaction.model';

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>;

export interface ImportedSheet {
  year: number;
  items: NewTransaction[];
}

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
];

// Colunas: A = grupo, B = subgrupo, C = item, D..O = meses (igual à planilha original)
const FIRST_MONTH_COL = 4;
const LAST_COL = FIRST_MONTH_COL + 11;

const NAVY = 'FF0F2A6B';
const NUMBER_FMT = '#,##0.00';
const CURRENCY_FMT = '"R$" #,##0.00';

const ROW_FILL: Record<string, string> = {
  fixed: 'FFDBE8F6',
  variable: 'FFDCEBD3',
  'non-essential': 'FFFBE4D5',
  income: 'FFDBE2F4'
};

async function loadExcelJs(): Promise<typeof import('exceljs')> {
  const mod = await import('exceljs');
  return ('default' in mod && mod.default ? mod.default : mod) as typeof import('exceljs');
}

const argb = (hex: string): string => 'FF' + hex.replace('#', '').toUpperCase();

function colLetter(col: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + col - 1);
}

// ============================== EXPORTAR ==============================

const MONTHS_SHORT = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];

// Mesmo formato exibido na tela: "18 nov. 2026"
export function formatUpdateDate(date: Date): string {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

export async function buildYearlyWorkbook(report: YearlyReport, updatedAt: Date = new Date()): Promise<Workbook> {
  const ExcelJS = await loadExcelJs();
  const wb = new ExcelJS.Workbook();
  // Congela a faixa azul (linha 1) para os meses ficarem visíveis ao rolar
  const ws = wb.addWorksheet(String(report.year), {
    views: [{ showGridLines: false, state: 'frozen', ySplit: 1 }]
  });

  ws.getColumn(1).width = 16;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 22;
  for (let c = FIRST_MONTH_COL; c <= LAST_COL; c++) ws.getColumn(c).width = 14;

  let row = 1;

  // Faixa azul contínua no topo: data de atualização + meses (uma só vez, como na planilha oficial)
  const writeTopBand = (): void => {
    const r = ws.getRow(row);
    r.height = 20;
    ws.mergeCells(row, 1, row, 3);
    r.getCell(1).value = `atualização: ${formatUpdateDate(updatedAt)}`;
    for (let c = 1; c <= LAST_COL; c++) {
      const cell = r.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: c <= 3 ? 'left' : 'center', vertical: 'middle' };
    }
    MONTHS.forEach((m, i) => {
      r.getCell(FIRST_MONTH_COL + i).value = m;
    });
    row++;
  };

  // Título da seção (Saída / Entrada / Total) com folga, como na planilha oficial
  const writeTitle = (title: string): void => {
    const r = ws.getRow(row);
    r.height = 36;
    ws.mergeCells(row, 1, row, 3);
    r.getCell(1).value = title;
    r.getCell(1).font = { bold: true, size: 12 };
    r.getCell(1).alignment = { horizontal: 'left', vertical: 'bottom', indent: 1 };
    row++;
  };

  // Escreve os grupos e devolve as linhas de subtotal de cada um
  const writeGroups = (groups: ReportGroup[], currency: boolean): number[] => {
    const subtotalRows: number[] = [];

    for (const group of groups) {
      const groupStart = row;
      const fill = ROW_FILL[group.id];

      for (const sub of group.subgroups) {
        const subStart = row;
        for (const item of sub.rows) {
          const r = ws.getRow(row);
          r.getCell(3).value = item.category.name;
          item.months.forEach((value, i) => {
            r.getCell(FIRST_MONTH_COL + i).value = value;
          });
          for (let c = 1; c <= LAST_COL; c++) {
            const cell = r.getCell(c);
            if (c >= FIRST_MONTH_COL) cell.numFmt = NUMBER_FMT;
            if (c >= 3) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
          }
          row++;
        }
        ws.mergeCells(subStart, 2, row - 1, 2);
        const subCell = ws.getCell(subStart, 2);
        subCell.value = sub.name;
        subCell.alignment = { horizontal: 'center', vertical: 'middle' };
        subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
      }

      // Subtotal do grupo (fórmula SUM + valor em cache)
      const r = ws.getRow(row);
      ws.mergeCells(row, 2, row, 3);
      r.getCell(2).value = 'Total';
      r.getCell(2).alignment = { horizontal: 'center' };
      group.months.forEach((value, i) => {
        const col = FIRST_MONTH_COL + i;
        const L = colLetter(col);
        r.getCell(col).value = { formula: `SUM(${L}${groupStart}:${L}${row - 1})`, result: value };
        r.getCell(col).numFmt = currency ? CURRENCY_FMT : NUMBER_FMT;
      });
      for (let c = 2; c <= LAST_COL; c++) {
        const cell = r.getCell(c);
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(group.color) } };
      }
      subtotalRows.push(row);

      ws.mergeCells(groupStart, 1, row, 1);
      const groupCell = ws.getCell(groupStart, 1);
      groupCell.value = group.name;
      groupCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      groupCell.alignment = { horizontal: 'center', vertical: 'middle' };
      groupCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(group.color) } };

      row++;
    }

    return subtotalRows;
  };

  // ----- SAÍDA -----
  writeTopBand();
  writeTitle('Saída');
  const expenseSubtotals = writeGroups(report.expenseGroups, false);

  const expenseTotalRow = row++;
  {
    const r = ws.getRow(expenseTotalRow);
    ws.mergeCells(expenseTotalRow, 1, expenseTotalRow, 3);
    r.getCell(1).value = 'Total';
    r.getCell(1).alignment = { horizontal: 'center' };
    report.expenseMonths.forEach((value, i) => {
      const col = FIRST_MONTH_COL + i;
      const L = colLetter(col);
      r.getCell(col).value = {
        formula: expenseSubtotals.map(s => `${L}${s}`).join('+'),
        result: value
      };
      r.getCell(col).numFmt = CURRENCY_FMT;
    });
    for (let c = 1; c <= LAST_COL; c++) {
      r.getCell(c).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    }
  }

  row++; // linha em branco

  // ----- ENTRADA -----
  writeTitle('Entrada');
  const incomeSubtotals = writeGroups(report.incomeGroups, true);
  const incomeTotalRow = incomeSubtotals[incomeSubtotals.length - 1];

  row++; // linha em branco

  // ----- TOTAL MENSAL -----
  writeTitle('Total');
  const monthlyStart = row;
  const monthlyRows: { label: string; values: number[]; formula: (L: string) => string }[] = [
    { label: 'Total de entrada', values: report.incomeMonths, formula: L => `${L}${incomeTotalRow}` },
    { label: 'Total de saída', values: report.expenseMonths, formula: L => `${L}${expenseTotalRow}` },
    {
      label: 'Total',
      values: report.balanceMonths,
      formula: L => `${L}${monthlyStart}-${L}${monthlyStart + 1}`
    }
  ];
  const monthlyFill = ['FFE2F0D9', 'FFFBE4D5', 'FFFFFFFF'];

  monthlyRows.forEach((def, idx) => {
    const r = ws.getRow(row);
    ws.mergeCells(row, 2, row, 3);
    r.getCell(2).value = def.label;
    r.getCell(2).font = { bold: true, color: { argb: idx === 2 ? 'FFFFFFFF' : 'FF000000' } };
    r.getCell(2).alignment = { horizontal: 'right' };
    r.getCell(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: idx === 2 ? NAVY : monthlyFill[idx] }
    };
    def.values.forEach((value, i) => {
      const col = FIRST_MONTH_COL + i;
      const cell = r.getCell(col);
      cell.value = { formula: def.formula(colLetter(col)), result: value };
      cell.numFmt = CURRENCY_FMT;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: monthlyFill[idx] } };
    });
    row++;
  });

  ws.mergeCells(monthlyStart, 1, row - 1, 1);
  const mensal = ws.getCell(monthlyStart, 1);
  mensal.value = 'Mensal';
  mensal.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  mensal.alignment = { horizontal: 'center', vertical: 'middle' };
  mensal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };

  row++; // linha em branco

  // ----- ANUAL -----
  const annualStart = row;
  const lastCol = colLetter(LAST_COL);
  const annualRows = [
    { label: 'Entrada', result: report.incomeTotal, src: monthlyStart, fill: 'FFE2F0D9', color: 'FF2E7D32' },
    { label: 'Saída', result: report.expenseTotal, src: monthlyStart + 1, fill: 'FFF8D7DA', color: 'FFB42318' },
    { label: 'Lucro', result: report.profit, src: monthlyStart + 2, fill: 'FF22A85A', color: 'FFFFFFFF' }
  ];
  for (const def of annualRows) {
    const r = ws.getRow(row);
    ws.mergeCells(row, 2, row, 3);
    r.getCell(2).value = def.label;
    r.getCell(2).alignment = { horizontal: 'right' };
    const valueCell = r.getCell(FIRST_MONTH_COL);
    valueCell.value = { formula: `SUM(D${def.src}:${lastCol}${def.src})`, result: def.result };
    valueCell.numFmt = CURRENCY_FMT;
    for (const cell of [r.getCell(2), valueCell]) {
      cell.font = { bold: true, color: { argb: def.color } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: def.fill } };
    }
    row++;
  }
  ws.mergeCells(annualStart, 1, row - 1, 1);
  const anual = ws.getCell(annualStart, 1);
  anual.value = 'Anual';
  anual.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  anual.alignment = { horizontal: 'center', vertical: 'middle' };
  anual.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };

  return wb;
}

export async function exportYearlyReport(report: YearlyReport, updatedAt: Date = new Date()): Promise<Blob> {
  const wb = await buildYearlyWorkbook(report, updatedAt);
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

// ============================== IMPORTAR ==============================

function toNumber(value: CellValue): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/R\$|\s/g, '').replace(/\./g, '').replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  if (value && typeof value === 'object' && 'result' in value) {
    return toNumber(value.result as CellValue);
  }
  return 0;
}

// Ignora acentos, maiúsculas/minúsculas e espaços extras ("Metro" == "Metrô")
const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const MONTH_KEYS = MONTHS.map(normalize);

// Colunas padrão (D..O) caso a planilha não tenha cabeçalho de meses reconhecível
const DEFAULT_MONTH_COLS = Array.from({ length: 12 }, (_, i) => FIRST_MONTH_COL + i);

// Procura nos cabeçalhos "Janeiro".."Dezembro" e devolve a coluna de cada mês (0 = não encontrado)
function detectMonthColumns(row: Row): number[] | null {
  const cols: number[] = new Array<number>(12).fill(0);
  let found = 0;

  row.eachCell({ includeEmpty: false }, (cell, col) => {
    const idx = MONTH_KEYS.indexOf(normalize(cell.text ?? ''));
    if (idx >= 0 && !cols[idx]) {
      cols[idx] = col;
      found++;
    }
  });

  // Exige pelo menos 6 meses para considerar a linha um cabeçalho
  return found >= 6 ? cols : null;
}

function readItems(ws: Worksheet, year: number): NewTransaction[] {
  const byName = new Map(CATEGORIES.map(c => [normalize(c.name), c]));
  const items: NewTransaction[] = [];

  // Cada seção (Saída, Entrada, Total) tem seu cabeçalho; o último encontrado vale para as linhas seguintes
  let monthCols = DEFAULT_MONTH_COLS;

  // Só as seções "Saída" e "Entrada" viram transações. Poupança, Total etc. são ignoradas
  // (ex.: "Apartamento" na Poupança é saldo de investimento, não a despesa de moradia).
  let inTransactionSection = true;

  ws.eachRow(row => {
    const section = normalize(row.getCell(1).text ?? '');
    if (section === 'saida' || section === 'entrada') inTransactionSection = true;
    else if (section === 'poupanca' || section === 'total') inTransactionSection = false;

    const header = detectMonthColumns(row);
    if (header) {
      monthCols = header;
      return;
    }

    if (!inTransactionSection) return;

    // O nome do item fica na coluna imediatamente à esquerda do primeiro mês
    const firstCol = Math.min(...monthCols.filter(c => c > 0));
    const category = byName.get(normalize(row.getCell(Math.max(1, firstCol - 1)).text ?? ''));
    if (!category) return;

    monthCols.forEach((col, m) => {
      if (!col) return;

      const amount = Math.round(toNumber(row.getCell(col).value) * 100) / 100;
      if (amount <= 0) return;

      items.push({
        description: `${category.name} (importado)`,
        amount,
        type: category.type === 'income' ? 'income' : 'expense',
        categoryId: category.id,
        date: `${year}-${String(m + 1).padStart(2, '0')}-01`
      });
    });
  });

  return items;
}

export async function parseYearlyWorkbook(data: ArrayBuffer, fallbackYear: number): Promise<ImportedSheet> {
  const ExcelJS = await loadExcelJs();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);

  const ws = wb.worksheets[0];
  if (!ws) throw new Error('Arquivo sem planilhas.');

  const year = /^\d{4}$/.test(ws.name.trim()) ? Number(ws.name.trim()) : fallbackYear;
  return { year, items: readItems(ws, year) };
}
