import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { AccountDialogs } from './core/auth/account-dialogs';
import { requireAuth, requireGuest } from './core/auth/auth.guard';
import { AuthState } from './core/auth/auth-state';
import { APP_SCREENS, headingForUrl } from './core/navigation/app-screens';
import { AppTitleStrategy } from './core/title/app-title.strategy';

describe('APP_SCREENS routes', () => {
  it('lists the initial screens', () => {
    expect(APP_SCREENS.map((screen) => screen.path)).toEqual([
      '',
      'game-roulette',
      'register-games',
    ]);
    expect(APP_SCREENS.map((screen) => screen.heading)).toEqual([
      'nossos jogos',
      'roleta de jogatina',
      'adicionar novo jogo',
    ]);
    expect(APP_SCREENS.map((screen) => screen.label)).toEqual([
      'joguinhos',
      'roleta',
      'novo jogo',
    ]);
    expect(APP_SCREENS.every((screen) => typeof screen.loadComponent === 'function')).toBe(true);
  });

  it('derives navigable routes from the screen catalog and redirects unknown paths', () => {
    const screenRoutes = routes.slice(0, -1);
    const wildcard = routes.at(-1);

    expect(screenRoutes).toEqual(
      APP_SCREENS.map((screen) => ({
        path: screen.path,
        title: screen.heading,
        loadComponent: screen.loadComponent,
      })),
    );
    expect(edit).toEqual({
      path: 'games/:id',
      title: 'editar jogo',
      canActivate: [requireAuth],
      loadComponent: expect.any(Function),
    });
    expect(wildcard).toEqual({ path: '**', redirectTo: '' });
  });

  it('falls back to the home heading when the url is not a screen', () => {
    const id = '4f1c0c3e-6b1a-4a1e-9c2d-1a2b3c4d5e6f';
    expect(headingForUrl(`/games/${id}`)).toBe('nossos jogos');
    expect(headingForUrl(`/games/${id}?origem=colecao`)).toBe('nossos jogos');
    expect(headingForUrl('/register-games')).toBe('nossos jogos');
    expect(headingForUrl('/game-roulette')).toBe('roleta de jogatina');
  });

  it('sends unknown urls to the home screen', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideLocationMocks(),
        { provide: TitleStrategy, useClass: AppTitleStrategy },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/missing-screen');

    expect(TestBed.inject(Router).url).toBe('/');
    expect(TestBed.inject(Title).getTitle()).toBe('Tela Inicial | Board Imperium');
  });
});
