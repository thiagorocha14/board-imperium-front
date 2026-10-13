import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  TitleStrategy,
  withEnabledBlockingInitialNavigation,
} from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { authRefreshInterceptor } from './core/http/auth-refresh.interceptor';
import { credentialsInterceptor } from './core/http/credentials.interceptor';
import { retroPreset } from './core/theme/retro.preset';
import { AppTitleStrategy } from './core/title/app-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withFetch(),
      withInterceptors([credentialsInterceptor, authRefreshInterceptor]),
    ),
    provideAppInitializer(() => inject(AuthService).prepareSession()),
    provideRouter(routes, withEnabledBlockingInitialNavigation()),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    providePrimeNG({
      license: environment.primeUiLicense,
      ripple: false,
      theme: {
        preset: retroPreset,
        options: {
          darkModeSelector: false,
          cssLayer: {
            name: 'primeng',
            order: 'primeng',
          },
        },
      },
    }),
  ],
};
