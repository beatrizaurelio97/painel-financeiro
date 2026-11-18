import { Component, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './summary-card.component.html',
  styleUrl: './summary-card.component.scss'
})
export class SummaryCardComponent {
  title = input.required<string>();
  amount = input.required<number>();
  icon = input.required<string>();
  variant = input<'balance' | 'income' | 'expense' | 'savings'>('balance');
  subtitle = input<string>();
}
