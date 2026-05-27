import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {
  public justBetOpen = signal(false);
  public helpOpen = signal(false);

  public toggleJustBet(event: Event): void {
    event.stopPropagation();
    this.justBetOpen.update(v => !v);
    this.helpOpen.set(false);
  }

  public toggleHelp(event: Event): void {
    event.stopPropagation();
    this.helpOpen.update(v => !v);
    this.justBetOpen.set(false);
  }

  @HostListener('document:click')
  public closeAllDropdowns(): void {
    this.justBetOpen.set(false);
    this.helpOpen.set(false);
  }
}
