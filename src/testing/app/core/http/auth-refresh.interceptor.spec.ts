import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
    TestRequest,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { AuthState } from '@core/auth/auth-state';
import { BACKEND_URL } from '@core/config/backend-url';
import { AUTH_RETRY } from '@core/http/auth-http';
import { authRefreshInterceptor } from '@core/http/auth-refresh.interceptor';
import { credentialsInterceptor } from '@core/http/credentials.interceptor';

@Component({ template: '' })
class BlankPage {}

const backendUrl = 'http://localhost:3000';

describe('authRefreshInterceptor', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                { provide: BACKEND_URL, useValue: backendUrl },
                provideHttpClient(
                    withInterceptors([credentialsInterceptor, authRefreshInterceptor]),
                ),
                provideHttpClientTesting(),
                provideRouter([
                    { path: '', component: BlankPage },
                    { path: 'entrar', component: BlankPage },
                ]),
                provideLocationMocks(),
            ],
        });
        TestBed.inject(AuthState).setAuthenticated({
            id: 'user-1',
            email: 'ana@example.com',
            displayName: 'Ana Silva',
            avatarUrl: null,
            lastLoginAt: null,
        });
    });

    afterEach(() => {
        TestBed.inject(HttpTestingController).verify();
    });

    it('refreshes once for parallel 401s and retries each request a single time', async () => {
        const http = TestBed.inject(HttpClient);
        const backend = TestBed.inject(HttpTestingController);
        const bodies: unknown[] = [];
        http.get(`${backendUrl}/board-games`).subscribe((body) => bodies.push(body));
        http.get(`${backendUrl}/users/me`).subscribe((body) => bodies.push(body));

        unauthorized(backend.expectOne(`${backendUrl}/board-games`));
        unauthorized(backend.expectOne(`${backendUrl}/users/me`));

        const refreshes = backend.match(`${backendUrl}/auth/refresh`);
        expect(refreshes).toHaveLength(1);
        expect(refreshes[0]?.request.responseType).toBe('text');
        expect(refreshes[0]?.request.withCredentials).toBe(true);
        refreshes[0]?.flush(null, { status: 204, statusText: 'No Content' });
        await settle();

        const games = backend.expectOne(`${backendUrl}/board-games`);
        const profile = backend.expectOne(`${backendUrl}/users/me`);
        expect(games.request.context.get(AUTH_RETRY)).toBe(true);
        expect(games.request.withCredentials).toBe(true);
        games.flush([{ id: 'game-1' }]);
        profile.flush({ id: 'user-1' });
        await settle();

        expect(bodies).toEqual([[{ id: 'game-1' }], { id: 'user-1' }]);
        backend.expectNone(`${backendUrl}/auth/refresh`);
    });

    it('does not refresh again when the retried request is still unauthorized', async () => {
        const http = TestBed.inject(HttpClient);
        const backend = TestBed.inject(HttpTestingController);
        let status = 0;
        http.get(`${backendUrl}/board-games`).subscribe({
            error: (error: { status: number }) => {
                status = error.status;
            },
        });

        unauthorized(backend.expectOne(`${backendUrl}/board-games`));
        backend
            .expectOne(`${backendUrl}/auth/refresh`)
            .flush(null, { status: 204, statusText: 'No Content' });
        await settle();
        unauthorized(backend.expectOne(`${backendUrl}/board-games`));
        await settle();

        expect(status).toBe(401);
        backend.expectNone(`${backendUrl}/auth/refresh`);
        expect(TestBed.inject(AuthState).status()).toBe('authenticated');
    });

    it('signs the user out when refresh fails and does not retry the original call', async () => {
        const http = TestBed.inject(HttpClient);
        const backend = TestBed.inject(HttpTestingController);
        http.get(`${backendUrl}/board-games`).subscribe({ error: () => undefined });

        unauthorized(backend.expectOne(`${backendUrl}/board-games`));
        unauthorized(backend.expectOne(`${backendUrl}/auth/refresh`));
        await settle();

        expect(TestBed.inject(AuthState).status()).toBe('unauthenticated');
        expect(TestBed.inject(AuthState).user()).toBeNull();
        backend.expectNone(`${backendUrl}/board-games`);
    });

    it.each([
        '/auth/refresh',
        '/auth/logout',
        '/auth/google/login',
        '/auth/login',
        '/auth/register',
    ])('does not refresh %s', async (path) => {
        const http = TestBed.inject(HttpClient);
        const backend = TestBed.inject(HttpTestingController);
        http.request('GET', `${backendUrl}${path}`, { responseType: 'text' }).subscribe({
            error: () => undefined,
        });

        unauthorized(backend.expectOne(`${backendUrl}${path}`));
        await settle();

        backend.expectNone(`${backendUrl}/auth/refresh`);
    });

    it('ignores unauthorized responses from other origins and non-401 statuses', async () => {
        const http = TestBed.inject(HttpClient);
        const backend = TestBed.inject(HttpTestingController);
        http.get('https://example.com/games').subscribe({ error: () => undefined });
        http.get(`${backendUrl}/board-games`).subscribe({ error: () => undefined });

        backend
            .expectOne('https://example.com/games')
            .flush({}, { status: 401, statusText: 'Unauthorized' });
        backend
            .expectOne(`${backendUrl}/board-games`)
            .flush({}, { status: 403, statusText: 'Forbidden' });
        await settle();

        backend.expectNone(`${backendUrl}/auth/refresh`);
    });
});

function unauthorized(request: TestRequest | undefined): void {
    if (!request) {
        return;
    }
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

function flushedBody(request: TestRequest, body: object): string | object {
    if (request.request.responseType === 'text') {
        return JSON.stringify(body);
    }
    return body;
}

function settle(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}
