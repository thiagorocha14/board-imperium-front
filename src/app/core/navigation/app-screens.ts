import { Route } from '@angular/router';

export const LOGIN_PATH = 'entrar';

export interface AppScreen {
  readonly path: string;
  readonly label: string;
  readonly heading: string;
  readonly loadComponent: NonNullable<Route['loadComponent']>;
}

export const APP_SCREENS: readonly AppScreen[] = [
  {
    path: '',
    label: 'joguinhos',
    heading: 'nossos jogos',
    loadComponent: () => import('../../features/home/home-page').then((module) => module.HomePage),
  },
  {
    path: 'game-roulette',
    label: 'roleta',
    heading: 'roleta de jogatina',
    loadComponent: () =>
      import('../../features/game-roulette/game-roulette-page').then(
        (module) => module.GameRoulettePage,
      ),
  },
];

export function headingForUrl(url: string): string {
  const path = screenPath(url);
  if (path === LOGIN_PATH) return 'entrar';
  return APP_SCREENS.find((screen) => screen.path === path)?.heading ?? 'nossos jogos';
}

function screenPath(url: string): string {
  const pathOnly = url.split(/[?#]/)[0] ?? '';
  return pathOnly.replace(/^\/+|\/+$/g, '');
}

