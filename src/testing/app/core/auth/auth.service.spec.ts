import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
    TestRequest,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { BACKEND_URL } from '@core/config/backend-url';
import { credentialsInterceptor } from '@core/http/credentials.interceptor';
import { AuthState } from '@core/auth/auth-state';
import {
    AUTH_REDIRECT,
    AuthService,
    credentialErrorMessage,
    GOOGLE_AUTH_ERROR_MESSAGE,
    sessionFailureMessage,
} from '@core/auth/auth.service';

@Component({ template: '' })
class BlankPage {}

const backendUrl = 'http://localhost:3000';
const user = {
    id: 'user-1',
    email: 'ana@example.com',
    displayName: 'Ana Silva',
    avatarUrl: 'https://example.com/ana.png',
    lastLoginAt: '2026-10-09T12:00:00.000Z',
};

describe('AuthService', () => {
    const redirects: string[] = [];

    beforeEach(() => {
        redirects.length = 0;
        TestBed.configureTestingModule({
            providers: [
                { provide: BACKEND_URL, useValue: backendUrl },
                {
                    provide: AUTH_REDIRECT,
                    useValue: { assign: (url: string) => redirects.push(url) },
                },
                provideHttpClient(withInterceptors([credentialsInterceptor])),
                provideHttpClientTesting(),
                provideRouter([
                    { path: '', component: BlankPage },
                    { path: 'entrar', component: BlankPage },
                ]),
                provideLocationMocks(),
            ],
        });
        window.history.replaceState({}, '', '/');
    });

    afterEach(() => {
        TestBed.inject(HttpTestingController).verify();
        window.history.replaceState({}, '', '/');
    });

    it('starts google sign-in with a full browser navigation', () => {
        TestBed.inject(AuthService).loginWithGoogle();

        expect(redirects).toEqual([`${backendUrl}/auth/google/login`]);
    });

    it('stores the profile when the session is already valid', async () => {
        const pending = TestBed.inject(AuthService).loadCurrentUser();
        const request = TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/users/me`);

        expect(request.request.withCredentials).toBe(true);
        request.flush({ ...user, accessToken: 'secret' });
        await pending;

        expect(TestBed.inject(AuthState).status()).toBe('authenticated');
        expect(TestBed.inject(AuthState).user()).toEqual(user);
    });

    it('refreshes once after 401 and loads the profile again', async () => {
        const pending = TestBed.inject(AuthService).loadCurrentUser();
        unauthorized(TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/users/me`));
        await settle();

        const refresh = TestBed.inject(HttpTestingController).expectOne(
            `${backendUrl}/auth/refresh`,
        );
        expect(refresh.request.method).toBe('POST');
        expect(refresh.request.withCredentials).toBe(true);
        expect(refresh.request.responseType).toBe('text');
        refresh.flush(null, { status: 204, statusText: 'No Content' });
        await settle();

        const retry = TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/users/me`);
        retry.flush(user);
        await pending;

        expect(TestBed.inject(AuthState).user()).toEqual(user);
        expect(TestBed.inject(AuthService).notice()).toBeNull();
    });

    it('stays signed out when refresh does not renew the session', async () => {
        const pending = TestBed.inject(AuthService).loadCurrentUser();
        unauthorized(TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/users/me`));
        await settle();
        unauthorized(TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/auth/refresh`));
        await pending;

        expect(TestBed.inject(AuthState).status()).toBe('unauthenticated');
        expect(TestBed.inject(AuthState).user()).toBeNull();
        TestBed.inject(HttpTestingController).expectNone(`${backendUrl}/users/me`);
    });

    it('explains a forbidden session check without trying to refresh', async () => {
        const pending = TestBed.inject(AuthService).loadCurrentUser();
        const request = TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/users/me`);
        request.flush(
            { statusCode: 403, error: 'ForbiddenError', message: 'Origin not allowed' },
            { status: 403, statusText: 'Forbidden' },
        );
        await pending;

        expect(TestBed.inject(AuthState).status()).toBe('unauthenticated');
        expect(TestBed.inject(AuthService).notice()).toBe(
            'Não foi possível entrar a partir desta origem.',
        );
        TestBed.inject(HttpTestingController).expectNone(`${backendUrl}/auth/refresh`);
    });

    it('describes rate limit and server failures', () => {
        expect(sessionFailureMessage(httpError(429))).toBe(
            'Muitas tentativas seguidas. Espere um pouco e tente de novo.',
        );
        expect(sessionFailureMessage(httpError(500))).toBe(
            'Algo deu errado por aqui. Tente de novo em instantes.',
        );
        expect(sessionFailureMessage(httpError(0))).toBe('Não foi possível verificar a sessão.');
    });

    it('shares a single refresh between concurrent callers', async () => {
        const service = TestBed.inject(AuthService);
        const first = service.refreshSession();
        const second = service.refreshSession();
        const requests = TestBed.inject(HttpTestingController).match(`${backendUrl}/auth/refresh`);

        expect(requests).toHaveLength(1);
        requests[0]?.flush(null, { status: 204, statusText: 'No Content' });

        await expect(first).resolves.toBe(true);
        await expect(second).resolves.toBe(true);
    });

    it('treats a refresh response other than 204 as a failure', async () => {
        const pending = TestBed.inject(AuthService).refreshSession();
        const refresh = TestBed.inject(HttpTestingController).expectOne(
            `${backendUrl}/auth/refresh`,
        );
        refresh.flush('ok', { status: 200, statusText: 'OK' });

        await expect(pending).resolves.toBe(false);
    });

    it('clears the local session when logout fails and opens the login screen', async () => {
        const state = TestBed.inject(AuthState);
        state.setAuthenticated(user);
        const pending = TestBed.inject(AuthService).logout();
        const request = TestBed.inject(HttpTestingController).expectOne(
            `${backendUrl}/auth/logout`,
        );

        expect(request.request.withCredentials).toBe(true);
        expect(request.request.responseType).toBe('text');
        request.flush('nope', { status: 500, statusText: 'Server Error' });
        await pending;

        expect(state.status()).toBe('unauthenticated');
        expect(state.user()).toBeNull();
        expect(TestBed.inject(Router).url).toBe('/entrar');
    });

    it('signs in with email and password and then loads the profile', async () => {
        const password = 'horse-battery ';
        const pending = TestBed.inject(AuthService).login('Ana@Example.com', password);
        const request = TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/auth/login`);

        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({ email: 'Ana@Example.com', password });
        expect(request.request.responseType).toBe('text');
        expect(request.request.withCredentials).toBe(true);
        request.flush(null, { status: 204, statusText: 'No Content' });
        await settle();

        const profile = TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/users/me`);
        expect(profile.request.method).toBe('GET');
        profile.flush(user);
        await pending;

        expect(TestBed.inject(AuthState).status()).toBe('authenticated');
        expect(TestBed.inject(AuthState).user()).toEqual(user);
        expect(TestBed.inject(AuthService).notice()).toBeNull();
    });

    it('rejects a wrong password without refreshing the session', async () => {
        const password = 'not-the-real-password';
        const pending = TestBed.inject(AuthService).login('ana@example.com', password);
        const request = TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/auth/login`);

        expect(request.request.body).toEqual({ email: 'ana@example.com', password });
        unauthorized(request);

        const caught = await pending.then(
            () => Promise.reject(new Error('expected login to fail')),
            (error: unknown) => error,
        );
        expect(caught).toBeInstanceOf(HttpErrorResponse);
        expect(credentialErrorMessage(caught)).toBe('E-mail ou senha incorretos.');
        expect(credentialErrorMessage(caught)).not.toContain(password);
        expect(TestBed.inject(AuthService).notice()).toBeNull();
        expect(TestBed.inject(AuthState).status()).toBe('loading');
        const http = TestBed.inject(HttpTestingController);
        http.expectNone(`${backendUrl}/auth/refresh`);
        http.expectNone(`${backendUrl}/users/me`);
    });

    it('creates an account and then loads the profile', async () => {
        const pending = TestBed.inject(AuthService).register(
            'Ana@Example.com',
            '  Ana Silva  ',
            'horse-battery ',
        );
        const request = TestBed.inject(HttpTestingController).expectOne(
            `${backendUrl}/auth/register`,
        );

        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({
            email: 'Ana@Example.com',
            displayName: '  Ana Silva  ',
            password: 'horse-battery ',
        });
        expect(request.request.responseType).toBe('text');
        expect(request.request.withCredentials).toBe(true);
        request.flush(null, { status: 204, statusText: 'No Content' });
        await settle();

        TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/users/me`).flush(user);
        await pending;

        expect(TestBed.inject(AuthState).status()).toBe('authenticated');
        expect(TestBed.inject(AuthState).user()).toEqual(user);
    });

    it('reports a registration conflict without describing the account', async () => {
        const pending = TestBed.inject(AuthService).register(
            'ana@example.com',
            'Ana Silva',
            'horse-battery ',
        );
        const request = TestBed.inject(HttpTestingController).expectOne(
            `${backendUrl}/auth/register`,
        );
        request.flush(
            JSON.stringify({
                statusCode: 409,
                error: 'ConflictError',
                message: 'Unable to complete registration',
            }),
            { status: 409, statusText: 'Conflict' },
        );

        const caught = await pending.then(
            () => Promise.reject(new Error('expected register to fail')),
            (error: unknown) => error,
        );
        expect(credentialErrorMessage(caught)).toBe('Não foi possível concluir o cadastro.');
        expect(credentialErrorMessage(caught)).not.toContain('Unable to complete registration');
        expect(TestBed.inject(AuthService).notice()).toBeNull();
        expect(TestBed.inject(AuthState).status()).toBe('loading');
        const http = TestBed.inject(HttpTestingController);
        http.expectNone(`${backendUrl}/auth/refresh`);
        http.expectNone(`${backendUrl}/users/me`);
    });

    it('treats a login response other than 204 as a failure', async () => {
        const pending = TestBed.inject(AuthService).login('ana@example.com', 'horse-battery ');
        const request = TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/auth/login`);
        request.flush('ok', { status: 200, statusText: 'OK' });

        await expect(pending).rejects.toBeInstanceOf(HttpErrorResponse);
        TestBed.inject(HttpTestingController).expectNone(`${backendUrl}/users/me`);
        expect(TestBed.inject(AuthState).status()).toBe('loading');
    });

    it('keeps the session notice when the profile cannot be loaded after login', async () => {
        const pending = TestBed.inject(AuthService).login('ana@example.com', 'horse-battery ');
        TestBed.inject(HttpTestingController)
            .expectOne(`${backendUrl}/auth/login`)
            .flush(null, { status: 204, statusText: 'No Content' });
        await settle();
        TestBed.inject(HttpTestingController)
            .expectOne(`${backendUrl}/users/me`)
            .flush(
                { statusCode: 403, error: 'ForbiddenError', message: 'Origin not allowed' },
                { status: 403, statusText: 'Forbidden' },
            );
        await pending;

        expect(TestBed.inject(AuthState).status()).toBe('unauthenticated');
        expect(TestBed.inject(AuthService).notice()).toBe(
            'Não foi possível entrar a partir desta origem.',
        );
    });

    it('translates credential failures without exposing the server text', () => {
        const secret = 'correct-horse-battery';
        expect(credentialErrorMessage(textError(401, { message: 'Authentication failed' }))).toBe(
            'E-mail ou senha incorretos.',
        );
        expect(
            credentialErrorMessage(
                textError(409, { message: 'Unable to complete registration', details: [secret] }),
            ),
        ).toBe('Não foi possível concluir o cadastro.');
        expect(
            credentialErrorMessage(
                textError(400, {
                    message: secret,
                    details: [
                        'password must be between 8 and 128 characters and must not be blank',
                    ],
                }),
            ),
        ).toBe('A senha precisa ter de 8 a 128 caracteres.');
        expect(
            credentialErrorMessage(
                textError(400, { message: 'Invalid request', details: ['email must be an email'] }),
            ),
        ).toBe('Informe um e-mail válido.');
        expect(credentialErrorMessage(textError(400, { message: 'Email is invalid' }))).toBe(
            'Informe um e-mail válido.',
        );
        expect(
            credentialErrorMessage(
                textError(400, { message: 'Display name must be between 1 and 120 characters' }),
            ),
        ).toBe('Informe um nome de até 120 caracteres.');
        expect(
            credentialErrorMessage(
                textError(400, {
                    message: 'Invalid request',
                    details: ['displayName must be shorter than or equal to 120 characters'],
                }),
            ),
        ).toBe('Informe um nome de até 120 caracteres.');
        expect(
            credentialErrorMessage(
                textError(400, {
                    message: 'Invalid request',
                    details: ['property role should not exist'],
                }),
            ),
        ).toBe('Confira os dados informados.');
        expect(
            credentialErrorMessage(
                textError(400, {
                    message: 'Invalid request',
                    details: [
                        'email must be an email',
                        'password must be between 8 and 128 characters and must not be blank',
                    ],
                }),
            ),
        ).toBe('Confira os dados informados.');
        expect(
            credentialErrorMessage(new HttpErrorResponse({ status: 400, error: 'not-json' })),
        ).toBe('Confira os dados informados.');
        expect(credentialErrorMessage(httpError(403))).toBe(
            'Não foi possível entrar a partir desta origem.',
        );
        expect(credentialErrorMessage(httpError(429))).toBe(
            'Muitas tentativas seguidas. Espere um pouco e tente de novo.',
        );
        expect(credentialErrorMessage(httpError(500))).toBe(
            'Algo deu errado por aqui. Tente de novo em instantes.',
        );
        expect(credentialErrorMessage(httpError(0))).toBe('Não foi possível verificar a sessão.');
        expect(
            credentialErrorMessage(textError(401, { message: secret, details: [secret] })),
        ).not.toContain(secret);
    });

    it('shows the google error and removes it from the url', async () => {
        window.history.replaceState({}, '', '/entrar?authError=1&keep=2');
        const pending = TestBed.inject(AuthService).prepareSession();

        expect(TestBed.inject(AuthService).notice()).toBe(GOOGLE_AUTH_ERROR_MESSAGE);
        expect(window.location.search).toBe('?keep=2');

        unauthorized(TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/users/me`));
        await settle();
        unauthorized(TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/auth/refresh`));
        await pending;

        expect(TestBed.inject(AuthState).status()).toBe('unauthenticated');
        expect(TestBed.inject(AuthService).notice()).toBe(GOOGLE_AUTH_ERROR_MESSAGE);
    });
});

function unauthorized(request: TestRequest): void {
    const body = {
        statusCode: 401,
        error: 'UnauthorizedError',
        message: 'Authentication failed',
    };
    request.flush(flushedBody(request, body), {
        status: 401,
        statusText: 'Unauthorized',
    });
}

function httpError(status: number): HttpErrorResponse {
    return new HttpErrorResponse({
        status,
        error: { statusCode: status, error: 'ApiError', message: 'failed' },
    });
}

function textError(
    status: number,
    body: { message?: string; details?: readonly string[] },
): HttpErrorResponse {
    return new HttpErrorResponse({
        status,
        error: JSON.stringify(textErrorBody(status, body)),
    });
}

function flushedBody(request: TestRequest, body: object): string | object {
    if (request.request.responseType === 'text') {
        return JSON.stringify(body);
    }
    return body;
}

function textErrorBody(
    status: number,
    body: { message?: string; details?: readonly string[] },
): {
    statusCode: number;
    error: string;
    message: string;
    details?: readonly string[];
} {
    const payload: {
        statusCode: number;
        error: string;
        message: string;
        details?: readonly string[];
    } = {
        statusCode: status,
        error: 'ApiError',
        message: body.message ?? 'failed',
    };
    if (body.details) {
        payload.details = body.details;
    }
    return payload;
}

function settle(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}
