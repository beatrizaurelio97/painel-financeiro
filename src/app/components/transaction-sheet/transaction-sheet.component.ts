import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FinanceService } from '../../services/finance.service';
import { exportYearlyReport, parseYearlyWorkbook } from '../../services/xlsx-sheet';

@Component({
  selector: 'app-transaction-sheet',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './transaction-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './transaction-sheet.component.scss'
})
export class TransactionSheetComponent {
  readonly financeService = inject(FinanceService);

  // Data da última atualização: lançamento mais recente (ou hoje, se não houver nenhum)
  readonly lastUpdate = computed<string>(() => {
    const dates = this.financeService
      .transactions()
      .map(t => t.createdAt)
      .filter(Boolean)
      .sort();
    return dates.length ? dates[dates.length - 1] : new Date().toISOString();
  });

  readonly monthLabels = [
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

  readonly monthShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Em telas estreitas a planilha exibe um mês por vez
  readonly selectedMonth = signal<number>(new Date().getMonth());

  onYearChange(value: string): void {
    this.financeService.selectedYear.set(Number(value));
  }

  onMonthChange(value: string): void {
    this.selectedMonth.set(Number(value));
  }

  readonly feedback = signal<{ kind: 'success' | 'error'; text: string } | null>(null);
  readonly isBusy = signal<boolean>(false);

  async onExport(): Promise<void> {
    this.isBusy.set(true);
    this.feedback.set(null);
    try {
      const report = this.financeService.yearlyReport();
      const blob = await exportYearlyReport(report, new Date(this.lastUpdate()));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `painel-financeiro-${report.year}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      this.feedback.set({ kind: 'success', text: `Planilha ${report.year} exportada.` });
    } catch {
      this.feedback.set({ kind: 'error', text: 'Não foi possível exportar a planilha.' });
    } finally {
      this.isBusy.set(false);
    }
  }

  async onImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.isBusy.set(true);
    this.feedback.set(null);
    try {
      const { year, items } = await parseYearlyWorkbook(await file.arrayBuffer(), this.financeService.selectedYear());

      const ok = confirm(
        `Importar ${items.length} lançamento(s) para ${year}?\nAs transações já existentes em ${year} serão substituídas.`
      );
      if (!ok) return;

      const count = await this.financeService.importYear(year, items);
      this.financeService.selectedYear.set(year);
      this.feedback.set({ kind: 'success', text: `${count} lançamento(s) importado(s) para ${year}.` });
    } catch {
      this.feedback.set({ kind: 'error', text: 'Arquivo inválido ou erro ao importar. Use uma planilha exportada por este painel.' });
    } finally {
      this.isBusy.set(false);
    }
  }
}
