import { Component } from '@angular/core';
import { FinancialChartComponent } from '../../components/financial-chart/financial-chart.component';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FinancialChartComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent {}
