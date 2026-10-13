import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { AuthState } from '../auth/auth-state';
import { AppTitleStrategy } from './app-title.strategy';

describe('AppTitleStrategy', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideLocationMocks(),
        { provide: TitleStrategy, useClass: AppTitleStrategy },
      ],
    });
  });

  it.each([
    ['/', 'Tela Inicial | Board Imperium'],
    ['/game-roulette', 'Roleta de Jogos | Board Imperium'],
    ['/register-games', 'Cadastrar Jogos | Board Imperium'],
  ])('sets the document title for %s', async (url, expected) => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    expect(TestBed.inject(Title).getTitle()).toBe(expected);
  });
});
