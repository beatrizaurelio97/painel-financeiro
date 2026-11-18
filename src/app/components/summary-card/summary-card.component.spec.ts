import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SummaryCardComponent } from './summary-card.component';
import { ComponentRef } from '@angular/core';

describe('SummaryCardComponent (Signal Inputs)', () => {
  let fixture: ComponentFixture<SummaryCardComponent>;
  let component: SummaryCardComponent;
  let componentRef: ComponentRef<SummaryCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SummaryCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SummaryCardComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    // Define Signal Inputs obrigatórios
    componentRef.setInput('title', 'Saldo Geral');
    componentRef.setInput('amount', 3500.5);
    componentRef.setInput('icon', '💳');
    componentRef.setInput('variant', 'balance');
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve renderizar o título e o ícone passados via Signal Inputs', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.card-title')?.textContent).toContain('Saldo Geral');
    expect(el.querySelector('.icon-wrapper')?.textContent).toContain('💳');
  });

  it('deve aplicar a classe de variante correspondente', () => {
    const cardEl = fixture.nativeElement.querySelector('.summary-card') as HTMLElement;
    expect(cardEl.classList.contains('balance')).toBe(true);
  });
});
