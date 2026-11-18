import { CATEGORIES, CATEGORY_GROUPS, categoryIdFor } from '../models/category.model';
import { ReportGroup, Transaction, YearlyReport } from '../models/transaction.model';

const emptyMonths = (): number[] => new Array<number>(12).fill(0);

const sum = (values: number[]): number => values.reduce((acc, v) => acc + v, 0);

const addMonths = (target: number[], source: number[]): void => {
  source.forEach((value, i) => (target[i] += value));
};

export function buildYearlyReport(transactions: Transaction[], year: number): YearlyReport {
  const byCategory = new Map<string, number[]>();

  for (const t of transactions) {
    const [y, m] = t.date.split('-').map(Number);
    if (y !== year || !m || m < 1 || m > 12) continue;

    const months = byCategory.get(t.categoryId) ?? emptyMonths();
    months[m - 1] += t.amount;
    byCategory.set(t.categoryId, months);
  }

  const groups = CATEGORY_GROUPS.map<ReportGroup & { type: 'income' | 'expense' }>(group => {
    const groupMonths = emptyMonths();

    const subgroups = group.subgroups.map(sub => ({
      name: sub.name,
      rows: sub.items.map(item => {
        const id = categoryIdFor(group.id, sub.name, item);
        const months = byCategory.get(id) ?? emptyMonths();
        addMonths(groupMonths, months);
        return {
          category: CATEGORIES.find(c => c.id === id)!,
          months,
          total: sum(months)
        };
      })
    }));

    return {
      id: group.id,
      type: group.type,
      name: group.name,
      color: group.color,
      subgroups,
      rowCount: subgroups.reduce((acc, s) => acc + s.rows.length, 0),
      months: groupMonths,
      total: sum(groupMonths)
    };
  });

  const expenseGroups = groups.filter(g => g.type === 'expense');
  const incomeGroups = groups.filter(g => g.type === 'income');

  const expenseMonths = emptyMonths();
  expenseGroups.forEach(g => addMonths(expenseMonths, g.months));

  const incomeMonths = emptyMonths();
  incomeGroups.forEach(g => addMonths(incomeMonths, g.months));

  const expenseTotal = sum(expenseMonths);
  const incomeTotal = sum(incomeMonths);

  return {
    year,
    expenseGroups,
    incomeGroups,
    expenseMonths,
    incomeMonths,
    balanceMonths: incomeMonths.map((income, i) => income - expenseMonths[i]),
    expenseTotal,
    incomeTotal,
    profit: incomeTotal - expenseTotal
  };
}
