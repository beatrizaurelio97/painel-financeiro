import { categoryIdFor } from '../models/category.model';
import { Transaction } from '../models/transaction.model';
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

describe('buildYearlyReport', () => {
  it('deve gerar a planilha zerada sem transações', () => {
    const report = buildYearlyReport([], 2026);

    expect(report.expenseTotal).toBe(0);
    expect(report.incomeTotal).toBe(0);
    expect(report.expenseGroups.map(g => g.name)).toEqual(['Fixas', 'Variáveis', 'Não essenciais']);
    expect(report.incomeGroups.map(g => g.name)).toEqual(['Receitas']);
  });

  it('deve somar transações por categoria, mês e totais', () => {
    const internet = categoryIdFor('fixed', 'Serviços', 'Internet');
    const uber = categoryIdFor('variable', 'Transporte', 'Uber');
    const mensal = categoryIdFor('income', 'Salário', 'Mensal');

    const report = buildYearlyReport(
      [
        tx({ categoryId: internet, amount: 100, date: '2026-01-05' }),
        tx({ categoryId: internet, amount: 50, date: '2026-01-20' }),
        tx({ categoryId: uber, amount: 30, date: '2026-03-02' }),
        tx({ categoryId: mensal, type: 'income', amount: 1000, date: '2026-01-01' }),
        tx({ categoryId: internet, amount: 999, date: '2025-01-01' })
      ],
      2026
    );

    const internetRow = report.expenseGroups[0].subgroups[0].rows[0];
    expect(internetRow.months[0]).toBe(150);
    expect(internetRow.total).toBe(150);
    expect(report.expenseGroups[0].total).toBe(150);
    expect(report.expenseMonths[2]).toBe(30);
    expect(report.expenseTotal).toBe(180);
    expect(report.incomeTotal).toBe(1000);
    expect(report.balanceMonths[0]).toBe(850);
    expect(report.profit).toBe(820);
  });
});
