import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AuthState } from '../auth/auth-state';
import { LOGIN_PATH } from '../navigation/app-screens';
import { BACKEND_URL } from '../config/backend-url';
import { AUTH_RETRY, isAuthRefreshExempt, SKIP_AUTH_REFRESH } from './auth-http';
import { isBackendRequest } from './credentials.interceptor';

export const authRefreshInterceptor: HttpInterceptorFn = (request, next) => {
  const backendUrl = inject(BACKEND_URL);
  const injector = inject(Injector);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      if (request.context.get(AUTH_RETRY) || request.context.get(SKIP_AUTH_REFRESH)) {
        return throwError(() => error);
      }
      if (!isBackendRequest(request.url, backendUrl) || isAuthRefreshExempt(request.url)) {
        return throwError(() => error);
      }
      if (injector.get(AuthState).status() === 'unauthenticated') {
        return throwError(() => error);
      }

      return from(injector.get(AuthService).refreshSession()).pipe(
        switchMap((refreshed) => {
          if (!refreshed) {
            const state = injector.get(AuthState);
            if (state.status() !== 'unauthenticated') {
              state.setUnauthenticated();
              void injector.get(Router).navigate(['/', LOGIN_PATH], { replaceUrl: true });
            }
            return throwError(() => error);
          }
          return next(
            request.clone({
              context: request.context.set(AUTH_RETRY, true),
            }),
          );
        }),
      );
    }),
  );
};
