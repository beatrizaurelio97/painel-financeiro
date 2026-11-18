/**
 * @jest-environment node
 */
import ExcelJS from 'exceljs';
import { categoryIdFor } from '../models/category.model';
import { Transaction } from '../models/transaction.model';
import { exportYearlyReport, formatUpdateDate, parseYearlyWorkbook } from './xlsx-sheet';
import { buildYearlyReport } from './yearly-report';

const tx = (partial: Partial<Transaction>): Transaction => ({
  id: 'tx',
  description: 'x',
  amount: 0,
  type: 'expense',
  categoryId: '',
  date: '2026-01-10',
  createdAt: '',
  ...partial
});

describe('xlsx-sheet', () => {
  const internet = categoryIdFor('fixed', 'Serviços', 'Internet');
  const uber = categoryIdFor('variable', 'Transporte', 'Uber');
  const mensal = categoryIdFor('income', 'Salário', 'Mensal');

  const transactions = [
    tx({ categoryId: internet, amount: 100, date: '2026-01-05' }),
    tx({ categoryId: internet, amount: 50.5, date: '2026-01-20' }),
    tx({ categoryId: uber, amount: 30, date: '2026-03-02' }),
    tx({ categoryId: mensal, type: 'income', amount: 1000, date: '2026-02-01' })
  ];

  const toBuffer = async (): Promise<ArrayBuffer> => {
    const blob = await exportYearlyReport(buildYearlyReport(transactions, 2026));
    return blob.arrayBuffer();
  };

  it('deve exportar e reimportar os mesmos valores por categoria e mês', async () => {
    const { year, items } = await parseYearlyWorkbook(await toBuffer(), 1999);

    expect(year).toBe(2026);

    const find = (categoryId: string, month: string) =>
      items.find(i => i.categoryId === categoryId && i.date === `2026-${month}-01`);

    expect(find(internet, '01')?.amount).toBe(150.5);
    expect(find(uber, '03')?.amount).toBe(30);
    expect(find(mensal, '02')?.amount).toBe(1000);
    expect(find(mensal, '02')?.type).toBe('income');
    expect(items).toHaveLength(3);
  });

  it('reimportar não deve alterar os totais do relatório', async () => {
    const { items } = await parseYearlyWorkbook(await toBuffer(), 2026);
    const again = buildYearlyReport(
      items.map((i, n) => ({ ...i, id: String(n), createdAt: '' })),
      2026
    );

    expect(again.expenseTotal).toBe(180.5);
    expect(again.incomeTotal).toBe(1000);
    expect(again.profit).toBe(819.5);
  });

  it('deve rejeitar arquivo que não é xlsx', async () => {
    await expect(parseYearlyWorkbook(new TextEncoder().encode('nao sou xlsx').buffer as ArrayBuffer, 2026)).rejects.toBeDefined();
  });

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const toArrayBuffer = async (wb: ExcelJS.Workbook): Promise<ArrayBuffer> => {
    const buf = await wb.xlsx.writeBuffer();
    return new Uint8Array(buf as ArrayBuffer).buffer as ArrayBuffer;
  };

  it('deve ignorar acentos e maiúsculas nos nomes dos itens (Metro == Metrô)', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('2026');
    MONTH_NAMES.forEach((m, i) => (ws.getCell(1, 4 + i).value = m));
    ws.getCell(2, 3).value = 'METRO';
    ws.getCell(2, 5).value = 12.5; // fevereiro
    ws.getCell(3, 3).value = 'refeicao';
    ws.getCell(3, 4).value = 20; // janeiro

    const { items } = await parseYearlyWorkbook(await toArrayBuffer(wb), 2026);

    expect(items).toHaveLength(2);
    expect(items.find(i => i.categoryId === categoryIdFor('variable', 'Transporte', 'Metrô'))).toMatchObject({
      amount: 12.5,
      date: '2026-02-01'
    });
    expect(items.find(i => i.categoryId === categoryIdFor('variable', 'Alimentação', 'Refeição'))).toMatchObject({
      amount: 20,
      date: '2026-01-01'
    });
  });

  it('deve localizar os meses pelo cabeçalho mesmo com colunas deslocadas', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Dados');
    // meses começando na coluna G (7), item na coluna F (6)
    MONTH_NAMES.forEach((m, i) => (ws.getCell(1, 7 + i).value = m));
    ws.getCell(2, 6).value = 'Internet';
    ws.getCell(2, 7).value = 99.9; // janeiro
    ws.getCell(2, 9).value = 10; // março

    const { year, items } = await parseYearlyWorkbook(await toArrayBuffer(wb), 2024);

    expect(year).toBe(2024); // aba sem nome de ano usa o ano de fallback
    expect(items.map(i => [i.date, i.amount])).toEqual([
      ['2024-01-01', 99.9],
      ['2024-03-01', 10]
    ]);
  });

  it('deve usar o cabeçalho de cada seção separadamente', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('2026');
    MONTH_NAMES.forEach((m, i) => (ws.getCell(1, 4 + i).value = m));
    ws.getCell(2, 3).value = 'Internet';
    ws.getCell(2, 4).value = 100;
    // segunda seção com meses deslocados uma coluna à direita
    MONTH_NAMES.forEach((m, i) => (ws.getCell(4, 5 + i).value = m));
    ws.getCell(5, 4).value = 'Mensal';
    ws.getCell(5, 5).value = 3000;

    const { items } = await parseYearlyWorkbook(await toArrayBuffer(wb), 2026);

    expect(items).toHaveLength(2);
    expect(items.find(i => i.type === 'income')).toMatchObject({ amount: 3000, date: '2026-01-01' });
  });

  it('deve ignorar a seção Poupança (Apartamento de investimento não é despesa de moradia)', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('2026');
    MONTH_NAMES.forEach((m, i) => (ws.getCell(1, 4 + i).value = m));
    ws.getCell(2, 1).value = 'Saída';
    ws.getCell(3, 3).value = 'Apartamento';
    ws.getCell(3, 4).value = 1700; // despesa de moradia
    ws.getCell(4, 1).value = 'Poupança';
    ws.getCell(5, 3).value = 'Apartamento';
    ws.getCell(5, 4).value = 29500; // saldo de investimento

    const { items } = await parseYearlyWorkbook(await toArrayBuffer(wb), 2026);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ amount: 1700, type: 'expense' });
  });

  it('deve exportar a faixa azul com a data de atualização e os meses só uma vez, e Saída abaixo', async () => {
    const blob = await exportYearlyReport(buildYearlyReport(transactions, 2026), new Date(2026, 10, 18));
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    const ws = wb.worksheets[0];

    expect(ws.getCell('A1').text).toBe('atualização: 18 nov. 2026');
    expect(ws.getCell('D1').text).toBe('Janeiro');
    expect(ws.getCell('O1').text).toBe('Dezembro');
    expect(ws.getCell('A2').text).toBe('Saída');
    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });

    // só a linha 1 tem os meses; Entrada e Total têm apenas o título
    let monthRows = 0;
    ws.eachRow(row => {
      if (row.getCell(4).text === 'Janeiro') monthRows++;
    });
    expect(monthRows).toBe(1);

    const titles: string[] = [];
    ws.eachRow(row => {
      const a = row.getCell(1).text;
      if (['Saída', 'Entrada', 'Total'].includes(a)) titles.push(a);
    });
    expect(titles).toEqual(['Saída', 'Total', 'Entrada', 'Total']); // o 1º Total é a soma geral da Saída
  });

  it('deve formatar a data como na tela (18 nov. 2026)', () => {
    expect(formatUpdateDate(new Date(2026, 10, 18))).toBe('18 nov. 2026');
    expect(formatUpdateDate(new Date(2026, 0, 5))).toBe('5 jan. 2026');
  });
});
