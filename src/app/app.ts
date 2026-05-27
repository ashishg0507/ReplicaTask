import { Component, signal } from '@angular/core';
import { Header } from './components/header/header';
import { Registration } from './components/registration/registration';
import { Footer } from './components/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Header, Registration, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('angular-app');
}

