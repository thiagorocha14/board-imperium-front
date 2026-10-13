import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, InjectionToken, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BACKEND_URL } from '../config/backend-url';
import { skipAuthRefresh } from '../http/auth-http';
import { backendPath } from '../http/backend-path';
import { readApiError } from '../http/api-error';
import { LOGIN_PATH } from '../navigation/app-screens';
import { AuthState } from './auth-state';
import { AuthUser, toAuthUser } from './auth-user.model';

export const GOOGLE_AUTH_ERROR_MESSAGE = 'Não foi possível entrar com o Google. Tente de novo.';

export interface AuthRedirect {
  assign(url: string): void;
}

export const AUTH_REDIRECT = new InjectionToken<AuthRedirect>('AUTH_REDIRECT', {
  factory: () => ({
    assign(url: string): void {
      globalThis.location.assign(url);
    },
  }),
});

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly backendUrl = inject(BACKEND_URL);
  private readonly state = inject(AuthState);
  private readonly router = inject(Router);
  private readonly redirect = inject(AUTH_REDIRECT);
  private readonly noticeState = signal<string | null>(null);
  private refreshInFlight: Promise<boolean> | null = null;

  readonly notice = this.noticeState.asReadonly();

  prepareSession(): Promise<void> {
    try {
      this.captureAuthError();
    } catch {
      // A broken return URL should not block the session check.
    }
    return this.loadCurrentUser();
  }

  loginWithGoogle(): void {
    this.redirect.assign(backendPath(this.backendUrl, '/auth/google/login'));
  }

  async loadCurrentUser(): Promise<void> {
    try {
      this.state.setAuthenticated(await this.fetchCurrentUser());
      this.noticeState.set(null);
    } catch (error) {
      if (!isUnauthorized(error)) {
        this.noteSessionProblem(error);
        this.state.setUnauthenticated();
        return;
      }
      const refreshed = await this.refreshSession();
      if (!refreshed) {
        this.state.setUnauthenticated();
        return;
      }
      try {
        this.state.setAuthenticated(await this.fetchCurrentUser());
        this.noticeState.set(null);
      } catch (retryError) {
        this.noteSessionProblem(retryError);
        this.state.setUnauthenticated();
      }
    }
  }

  refreshSession(): Promise<boolean> {
    this.refreshInFlight ??= this.requestRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  login(email: string, password: string): Promise<void> {
    return this.openSession('/auth/login', { email, password });
  }

  register(email: string, displayName: string, password: string): Promise<void> {
    return this.openSession('/auth/register', { email, displayName, password });
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(backendPath(this.backendUrl, '/auth/logout'), null, {
          observe: 'response',
          responseType: 'text',
          context: skipAuthRefresh(),
        }),
      );
    } catch {
      // The local session ends even when the server cannot be reached.
    }
    this.state.setUnauthenticated();
    await this.router.navigate(['/', LOGIN_PATH], { replaceUrl: true });
  }

  private async openSession(
    path: '/auth/login' | '/auth/register',
    body: SessionBody,
  ): Promise<void> {
    const response = await firstValueFrom(
      this.http.post(backendPath(this.backendUrl, path), body, {
        observe: 'response',
        responseType: 'text',
        context: skipAuthRefresh(),
      }),
    );
    if (response.status !== 204) {
      throw new HttpErrorResponse({
        status: response.status,
        statusText: response.statusText,
        url: response.url ?? undefined,
        error: response.body,
      });
    }
    await this.loadCurrentUser();
  }

  private fetchCurrentUser(): Promise<AuthUser> {
    return firstValueFrom(
      this.http.get<unknown>(backendPath(this.backendUrl, '/users/me'), {
        context: skipAuthRefresh(),
      }),
    ).then((body) => {
      const user = toAuthUser(body);
      if (!user) throw new Error('Invalid user payload');
      return user;
    });
  }

  private requestRefresh(): Promise<boolean> {
    return firstValueFrom(
      this.http.post(backendPath(this.backendUrl, '/auth/refresh'), null, {
        observe: 'response',
        responseType: 'text',
        context: skipAuthRefresh(),
      }),
    ).then(
      (response) => response.status === 204,
      () => false,
    );
  }

  private captureAuthError(): void {
    const current = new URL(globalThis.location.href);
    if (current.searchParams.get('authError') !== '1') return;
    this.noticeState.set(GOOGLE_AUTH_ERROR_MESSAGE);
    current.searchParams.delete('authError');
    const next = `${current.pathname}${current.search}${current.hash}`;
    globalThis.history.replaceState(globalThis.history.state, '', next);
  }

  private noteSessionProblem(error: unknown): void {
    if (this.noticeState() !== null) return;
    if (isUnauthorized(error)) return;
    this.noticeState.set(sessionFailureMessage(error));
  }
}

export function sessionFailureMessage(error: unknown): string {
  const status = readApiError(error)?.statusCode ?? httpStatus(error);
  if (status === 403) return 'Não foi possível entrar a partir desta origem.';
  if (status === 429) return 'Muitas tentativas seguidas. Espere um pouco e tente de novo.';
  if (status >= 500) return 'Algo deu errado por aqui. Tente de novo em instantes.';
  return 'Não foi possível verificar a sessão.';
}

export function credentialErrorMessage(error: unknown): string {
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  if (status === 400 && error instanceof HttpErrorResponse) return validationMessage(error);
  if (status === 401) return 'E-mail ou senha incorretos.';
  if (status === 409) return 'Não foi possível concluir o cadastro.';
  return sessionFailureMessage(error);
}

const PASSWORD_DETAIL = 'password must be between 8 and 128 characters and must not be blank';

type SessionBody =
  | { readonly email: string; readonly password: string }
  | { readonly email: string; readonly displayName: string; readonly password: string };

type CredentialField = 'email' | 'password' | 'name';

function validationMessage(error: HttpErrorResponse): string {
  const body = readCredentialBody(error);
  const fields = new Set<CredentialField>();
  const messageField = fieldFromMessage(body?.message ?? '');
  if (messageField) fields.add(messageField);

  let unknown = false;
  for (const detail of body?.details ?? []) {
    const field = fieldFromDetail(detail);
    if (field) fields.add(field);
    else unknown = true;
  }

  if (unknown || fields.size !== 1) return 'Confira os dados informados.';
  if (fields.has('password')) return 'A senha precisa ter de 8 a 128 caracteres.';
  if (fields.has('email')) return 'Informe um e-mail válido.';
  return 'Informe um nome de até 120 caracteres.';
}

function fieldFromMessage(message: string): CredentialField | null {
  if (message === 'Display name must be between 1 and 120 characters') return 'name';
  if (message === 'Email is invalid') return 'email';
  return null;
}

function fieldFromDetail(detail: string): CredentialField | null {
  if (detail === PASSWORD_DETAIL || detail.startsWith('password ')) return 'password';
  if (detail.startsWith('email ')) return 'email';
  if (detail.startsWith('displayName ')) return 'name';
  return null;
}

function readCredentialBody(
  error: HttpErrorResponse,
): { message: string; details: readonly string[] } | null {
  const raw: unknown = typeof error.error === 'string' ? parseJson(error.error) : error.error;
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;
  const message = typeof record['message'] === 'string' ? record['message'] : '';
  const details = record['details'];
  return {
    message,
    details: Array.isArray(details)
      ? details.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function isUnauthorized(error: unknown): boolean {
  return httpStatus(error) === 401;
}

function httpStatus(error: unknown): number {
  return error instanceof HttpErrorResponse ? error.status : 0;
}
