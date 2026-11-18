import { Component, inject } from '@angular/core';
import { CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
import { FinanceService } from '../../services/finance.service';

@Component({
  selector: 'app-financial-chart',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, PercentPipe],
  templateUrl: './financial-chart.component.html',
  styleUrl: './financial-chart.component.scss'
})
export class FinancialChartComponent {
  readonly financeService = inject(FinanceService);
}
