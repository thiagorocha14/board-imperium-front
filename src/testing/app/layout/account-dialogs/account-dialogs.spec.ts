import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
    TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountDialogs as AccountDialogState } from '@core/auth/account-dialogs';
import { AuthState } from '@core/auth/auth-state';
import { AUTH_REDIRECT, AuthService, GOOGLE_AUTH_ERROR_MESSAGE } from '@core/auth/auth.service';
import { BACKEND_URL } from '@core/config/backend-url';
import { authRefreshInterceptor } from '@core/http/auth-refresh.interceptor';
import { credentialsInterceptor } from '@core/http/credentials.interceptor';
import { AccountDialogs } from '@layout/account-dialogs/account-dialogs';

const backendUrl = 'http://localhost:3000';
const user = {
    id: 'user-1',
    email: 'ana@example.com',
    displayName: 'Ana Silva',
    avatarUrl: null,
    lastLoginAt: null,
};

describe('AccountDialogs', () => {
    const redirects: string[] = [];
    let fixture: ComponentFixture<AccountDialogs> | undefined;

    beforeEach(async () => {
        redirects.length = 0;
        window.history.replaceState({}, '', '/');
        await TestBed.configureTestingModule({
            imports: [AccountDialogs],
            providers: [
                { provide: BACKEND_URL, useValue: backendUrl },
                {
                    provide: AUTH_REDIRECT,
                    useValue: { assign: (url: string) => redirects.push(url) },
                },
                provideHttpClient(
                    withInterceptors([credentialsInterceptor, authRefreshInterceptor]),
                ),
                provideHttpClientTesting(),
            ],
        }).compileComponents();
    });

    afterEach(() => {
        fixture?.destroy();
        fixture = undefined;
        TestBed.inject(HttpTestingController).verify();
        window.history.replaceState({}, '', '/');
    });

    function open(): ComponentFixture<AccountDialogs> {
        fixture = TestBed.createComponent(AccountDialogs);
        TestBed.inject(AccountDialogState).openLogin();
        fixture.detectChanges();
        return fixture;
    }

    it('sends the login when entrar com e-mail is submitted', async () => {
        const view = open();
        expect(document.body.textContent).not.toContain('ainda não está disponível');
        expect(dialog().querySelector('.p-dialog-title')?.textContent?.trim()).toBe('entrar');
        fill('#login-email', 'Ana@Example.com');
        fill('#login-password', 'senha-valida');

        const button = submitButton();
        expect(button.textContent?.trim()).toBe('entrar com e-mail');
        expect(button.disabled).toBe(false);
        button.click();
        button.click();

        const http = TestBed.inject(HttpTestingController);
        const requests = http.match(`${backendUrl}/auth/login`);
        expect(requests).toHaveLength(1);
        expect(requests[0]?.request.method).toBe('POST');
        expect(requests[0]?.request.body).toEqual({
            email: 'Ana@Example.com',
            password: 'senha-valida',
        });
        expect(requests[0]?.request.responseType).toBe('text');
        expect(requests[0]?.request.withCredentials).toBe(true);
        view.detectChanges();
        expect(submitButton().disabled).toBe(true);

        requests[0]?.flush(null, { status: 204, statusText: 'No Content' });
        await settle();
        http.expectOne(`${backendUrl}/users/me`).flush(user);
        await settle();
        view.detectChanges();

        expect(TestBed.inject(AuthState).status()).toBe('authenticated');
        expect(document.body.querySelector('.p-dialog')).toBeNull();
    });

    it.each([
        ['curta', 'curta', 'A senha precisa ter de 8 a 128 caracteres.'],
        ['em branco', ' '.repeat(8), 'Informe uma senha.'],
        ['longa', 'z'.repeat(129), 'A senha precisa ter de 8 a 128 caracteres.'],
    ])('does not post a %s password', (_label, password, message) => {
        const view = open();
        fill('#login-email', 'ana@example.com');
        fill('#login-password', password);
        submitButton().click();
        view.detectChanges();

        expect(
            TestBed.inject(HttpTestingController).match(`${backendUrl}/auth/login`),
        ).toHaveLength(0);
        expect(document.body.querySelector('#login-password-error')?.textContent).toContain(
            message,
        );
        expect(inputValue('#login-password')).toBe(password);
    });

    it('posts a password of 8 characters', async () => {
        const view = open();
        fill('#login-email', 'ana@example.com');
        fill('#login-password', '12345678');
        submitButton().click();
        view.detectChanges();

        const request = TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/auth/login`);
        expect(request.request.body).toEqual({ email: 'ana@example.com', password: '12345678' });
        unauthorized(request);
        await settle();
        view.detectChanges();
        expect(inputValue('#login-password')).toBe('');
    });

    it('does not post an invalid email, a blank name, or an oversized name', () => {
        const view = open();
        fill('#login-email', 'nao-e-email');
        fill('#login-password', 'senha-valida');
        submitButton().click();
        view.detectChanges();

        const http = TestBed.inject(HttpTestingController);
        expect(http.match(`${backendUrl}/auth/login`)).toHaveLength(0);
        expect(document.body.querySelector('#login-email-error')?.textContent).toContain(
            'Informe um e-mail válido.',
        );

        clickButton('criar conta');
        view.detectChanges();
        fill('#login-email', 'ana@example.com');
        fill('#login-name', '   ');
        fill('#login-password', 'senha-valida');
        fill('#login-confirm', 'senha-valida');
        submitButton().click();
        view.detectChanges();

        expect(http.match(`${backendUrl}/auth/register`)).toHaveLength(0);
        expect(document.body.querySelector('#login-name-error')?.textContent).toContain(
            'Informe um nome de até 120 caracteres.',
        );

        fill('#login-name', 'n'.repeat(121));
        submitButton().click();
        view.detectChanges();
        expect(http.match(`${backendUrl}/auth/register`)).toHaveLength(0);
    });

    it('keeps a mismatched confirmation local and posts the password only once', async () => {
        const view = open();
        clickButton('criar conta');
        view.detectChanges();
        fill('#login-email', 'Ana@Example.com');
        fill('#login-name', '  Ana Silva  ');
        fill('#login-password', 'senha-valida');
        fill('#login-confirm', 'outra-senha-1');
        submitButton().click();
        view.detectChanges();

        const http = TestBed.inject(HttpTestingController);
        expect(http.match(`${backendUrl}/auth/register`)).toHaveLength(0);
        expect(document.body.querySelector('#login-confirm-error')?.textContent).toContain(
            'A confirmação precisa ser igual à senha.',
        );

        fill('#login-confirm', 'senha-valida');
        submitButton().click();
        const request = http.expectOne(`${backendUrl}/auth/register`);
        expect(request.request.body).toEqual({
            email: 'Ana@Example.com',
            displayName: '  Ana Silva  ',
            password: 'senha-valida',
        });
        expect(request.request.body).not.toHaveProperty('confirmPassword');
        expect(request.request.responseType).toBe('text');
        request.flush(null, { status: 204, statusText: 'No Content' });
        await settle();
        http.expectOne(`${backendUrl}/users/me`).flush(user);
        await settle();
        view.detectChanges();

        expect(TestBed.inject(AuthState).status()).toBe('authenticated');
        expect(document.body.querySelector('.p-dialog')).toBeNull();
    });

    it('shows only the generic message when the password is rejected', async () => {
        const view = open();
        const password = 'senha-valida';
        fill('#login-email', 'ana@example.com');
        fill('#login-password', password);
        submitButton().click();

        const http = TestBed.inject(HttpTestingController);
        unauthorized(http.expectOne(`${backendUrl}/auth/login`));
        await settle();
        view.detectChanges();

        const alert = document.body.querySelector('.login-error')?.textContent ?? '';
        expect(alert).toContain('E-mail ou senha incorretos.');
        expect(alert).not.toContain('Authentication failed');
        expect(alert).not.toContain('Sessão inválida');
        expect(document.body.textContent).not.toContain(password);
        expect(inputValue('#login-password')).toBe('');
        expect(inputValue('#login-email')).toBe('ana@example.com');
        expect(TestBed.inject(AuthService).notice()).toBeNull();
        expect(document.body.querySelector('.p-dialog')).not.toBeNull();
        http.expectNone(`${backendUrl}/auth/refresh`);
        http.expectNone(`${backendUrl}/users/me`);
    });

    it('shows only the generic message when registration conflicts', async () => {
        const view = open();
        clickButton('criar conta');
        view.detectChanges();
        fill('#login-email', 'ana@example.com');
        fill('#login-name', 'Ana Silva');
        fill('#login-password', 'senha-valida');
        fill('#login-confirm', 'senha-valida');
        submitButton().click();

        const http = TestBed.inject(HttpTestingController);
        http.expectOne(`${backendUrl}/auth/register`).flush(
            JSON.stringify({
                statusCode: 409,
                error: 'ConflictError',
                message: 'Unable to complete registration',
            }),
            { status: 409, statusText: 'Conflict' },
        );
        await settle();
        view.detectChanges();

        const alert = document.body.querySelector('.login-error')?.textContent ?? '';
        expect(alert).toContain('Não foi possível concluir o cadastro.');
        expect(alert).not.toContain('Unable to complete registration');
        expect(alert.toLowerCase()).not.toContain('google');
        expect(document.body.textContent).not.toContain('senha-valida');
        expect(inputValue('#login-password')).toBe('');
        expect(inputValue('#login-confirm')).toBe('');
        expect(inputValue('#login-email')).toBe('ana@example.com');
        expect(inputValue('#login-name')).toBe('Ana Silva');
        expect(TestBed.inject(AuthService).notice()).toBeNull();
        http.expectNone(`${backendUrl}/auth/refresh`);
        http.expectNone(`${backendUrl}/users/me`);
    });

    it('clears the password and returns to sign-in when the dialog closes', () => {
        const view = open();
        clickButton('criar conta');
        view.detectChanges();
        fill('#login-email', 'ana@example.com');
        fill('#login-name', 'Ana Silva');
        fill('#login-password', 'senha-valida');
        fill('#login-confirm', 'outra-senha-1');
        submitButton().click();
        view.detectChanges();
        expect(document.body.querySelector('#login-confirm-error')).not.toBeNull();

        const close = document.body.querySelector('button[aria-label="fechar"]');
        if (!(close instanceof HTMLButtonElement)) {
            throw new Error('missing close');
        }
        close.click();
        view.detectChanges();

        TestBed.inject(AccountDialogState).openLogin();
        view.detectChanges();

        expect(dialog().querySelector('.p-dialog-title')?.textContent?.trim()).toBe('entrar');
        expect(document.body.querySelector('.google-action')).not.toBeNull();
        expect(document.body.querySelector('#login-confirm')).toBeNull();
        expect(document.body.querySelector('#login-confirm-error')).toBeNull();
        expect(document.body.querySelector('.login-error')).toBeNull();
        expect(inputValue('#login-password')).toBe('');
        expect(inputValue('#login-email')).toBe('ana@example.com');
    });

    it('asks the person to retry when the session cannot be checked after login', async () => {
        const view = open();
        fill('#login-email', 'ana@example.com');
        fill('#login-password', 'senha-valida');
        submitButton().click();

        const http = TestBed.inject(HttpTestingController);
        http.expectOne(`${backendUrl}/auth/login`).flush(null, {
            status: 204,
            statusText: 'No Content',
        });
        await settle();
        unauthorized(http.expectOne(`${backendUrl}/users/me`));
        await settle();
        unauthorized(http.expectOne(`${backendUrl}/auth/refresh`));
        await settle();
        view.detectChanges();

        expect(document.body.querySelector('.login-error')?.textContent).toContain(
            'Não foi possível verificar a sessão.',
        );
        expect(document.body.querySelector('.p-dialog')).not.toBeNull();
        expect(inputValue('#login-password')).toBe('');
        expect(inputValue('#login-email')).toBe('ana@example.com');
        expect(TestBed.inject(AuthState).status()).toBe('unauthenticated');
    });

    it('keeps the google notice and the google button on the sign-in mode', async () => {
        window.history.replaceState({}, '', '/entrar?authError=1');
        const pending = TestBed.inject(AuthService).prepareSession();
        const http = TestBed.inject(HttpTestingController);
        unauthorized(http.expectOne(`${backendUrl}/users/me`));
        await settle();
        unauthorized(http.expectOne(`${backendUrl}/auth/refresh`));
        await pending;

        const view = open();
        expect(document.body.querySelector('.login-error')?.textContent).toContain(
            GOOGLE_AUTH_ERROR_MESSAGE,
        );
        const google = document.body.querySelector('.google-action');
        const modeSwitch = document.body.querySelector('.mode-switch');
        expect(google?.textContent).toContain('entrar com o google');
        expect(modeSwitch?.textContent?.trim()).toBe('criar conta');
        expect(
            google instanceof HTMLElement &&
                modeSwitch instanceof HTMLElement &&
                Boolean(
                    google.compareDocumentPosition(modeSwitch) & Node.DOCUMENT_POSITION_FOLLOWING,
                ),
        ).toBe(true);
        expect(document.body.querySelector('#login-email')?.getAttribute('autocomplete')).toBe(
            'username',
        );
        expect(document.body.querySelector('#login-password')?.getAttribute('autocomplete')).toBe(
            'current-password',
        );

        (google as HTMLButtonElement).click();
        expect(redirects).toEqual([`${backendUrl}/auth/google/login`]);

        clickButton('criar conta');
        view.detectChanges();
        expect(document.body.querySelector('.google-action')).toBeNull();
        expect(document.body.querySelector('.mode-switch')?.textContent?.trim()).toBe(
            'já tenho conta',
        );
        expect(dialog().querySelector('.p-dialog-title')?.textContent?.trim()).toBe('criar conta');
        expect(document.body.querySelector('#login-name')?.getAttribute('autocomplete')).toBe(
            'name',
        );
        expect(document.body.querySelector('#login-email')?.getAttribute('autocomplete')).toBe(
            'email',
        );
        expect(document.body.querySelector('#login-password')?.getAttribute('autocomplete')).toBe(
            'new-password',
        );
        expect(document.body.querySelector('#login-confirm')?.getAttribute('autocomplete')).toBe(
            'new-password',
        );

        clickButton('já tenho conta');
        view.detectChanges();
        expect(document.body.querySelector('.google-action')).not.toBeNull();
        expect(dialog().querySelector('.p-dialog-title')?.textContent?.trim()).toBe('entrar');
    });
});

function dialog(): HTMLElement {
    const element = document.body.querySelector('.p-dialog');
    if (!(element instanceof HTMLElement)) {
        throw new Error('missing dialog');
    }
    return element;
}

function submitButton(): HTMLButtonElement {
    const button = dialog().querySelector('.login-form button[type="submit"]');
    if (!(button instanceof HTMLButtonElement)) {
        throw new Error('missing submit');
    }
    return button;
}

function clickButton(text: string): void {
    const button = [...dialog().querySelectorAll('button')].find(
        (item) => item instanceof HTMLButtonElement && item.textContent?.trim() === text,
    );
    if (!(button instanceof HTMLButtonElement)) {
        throw new Error(`missing button ${text}`);
    }
    button.click();
}

function fill(selector: string, value: string): void {
    const input = dialog().querySelector(selector);
    if (!(input instanceof HTMLInputElement)) {
        throw new Error(selector);
    }
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function inputValue(selector: string): string {
    const input = dialog().querySelector(selector);
    if (!(input instanceof HTMLInputElement)) {
        throw new Error(selector);
    }
    return input.value;
}

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

function flushedBody(request: TestRequest, body: object): string | object {
    if (request.request.responseType === 'text') {
        return JSON.stringify(body);
    }
    return body;
}

function settle(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}
