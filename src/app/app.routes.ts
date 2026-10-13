import { Routes } from '@angular/router';
import { requireAuth, requireGuest } from './core/auth/auth.guard';
import { APP_SCREENS, LOGIN_PATH } from './core/navigation/app-screens';

export const routes: Routes = [
  {
    path: LOGIN_PATH,
    title: 'entrar',
    canActivate: [requireGuest],
    loadComponent: () => import('./features/login/login-page').then((module) => module.LoginPage),
  },
  ...APP_SCREENS.map((screen) => ({
    path: screen.path,
    title: screen.heading,
    canActivate: [requireAuth],
    loadComponent: screen.loadComponent,
  })),
  { path: '**', redirectTo: '' },
];

