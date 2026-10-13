import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { AccountDialogs as AccountDialogState } from '@core/auth/account-dialogs';
import { AuthState } from '@core/auth/auth-state';
import { AuthService, credentialErrorMessage } from '@core/auth/auth.service';

const UNVERIFIED_SESSION = 'Não foi possível verificar a sessão.';

type AccountMode = 'login' | 'register';

interface AccountFormValue {
    email: string;
    displayName: string;
    password: string;
    confirmPassword: string;
}

interface AccountFieldErrors {
    email?: string;
    displayName?: string;
    password?: string;
    confirmPassword?: string;
}

@Component({
    selector: 'app-account-dialogs',
    imports: [Dialog, InputText, ReactiveFormsModule],
    templateUrl: './account-dialogs.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDialogs {
    private readonly dialogs = inject(AccountDialogState);
    private readonly auth = inject(AuthService);
    private readonly authState = inject(AuthState);

    protected readonly loginOpen = this.dialogs.loginOpen;
    protected readonly logoutOpen = this.dialogs.logoutOpen;
    protected readonly notice = this.auth.notice;
    protected readonly mode = signal<AccountMode>('login');
    protected readonly submitting = signal(false);
    protected readonly leaving = signal(false);
    protected readonly formError = signal<string | null>(null);
    protected readonly fieldErrors = signal<AccountFieldErrors>({});
    protected readonly form = new FormGroup({
        email: new FormControl('', { nonNullable: true }),
        displayName: new FormControl('', { nonNullable: true }),
        password: new FormControl('', { nonNullable: true }),
        confirmPassword: new FormControl('', { nonNullable: true }),
    });

    constructor() {
        effect(() => {
            if (this.authState.status() === 'authenticated') {
                this.dialogs.closeLogin();
            }
        });

        effect(() => {
            if (this.loginOpen()) {
                return;
            }
            this.resetClosedLogin();
        });
    }

    protected onLoginVisible(open: boolean): void {
        if (open) {
            this.dialogs.openLogin();
        } else {
            this.dialogs.closeLogin();
        }
    }

    protected onLogoutVisible(open: boolean): void {
        if (open) {
            this.dialogs.openLogout();
        } else {
            this.dialogs.closeLogout();
        }
    }

    protected switchMode(): void {
        if (this.submitting()) {
            return;
        }
        this.mode.set(this.nextMode());
        this.formError.set(null);
        this.fieldErrors.set({});
    }

    protected onPasswordLogin(): void {
        if (this.submitting()) {
            return;
        }
        const value = this.form.getRawValue();
        const errors = validationErrors(this.mode(), value);
        this.fieldErrors.set(errors);
        if (hasFieldErrors(errors)) {
            this.formError.set(null);
            return;
        }

        this.formError.set(null);
        this.submitting.set(true);
        const pending = this.passwordRequest(value);

        void pending
            .then(() => {
                if (!this.loginOpen() || this.authState.status() === 'authenticated') {
                    return;
                }
                if (!this.auth.notice()) {
                    this.formError.set(UNVERIFIED_SESSION);
                }
            })
            .catch((error: unknown) => {
                if (!this.loginOpen()) {
                    return;
                }
                this.formError.set(credentialErrorMessage(error));
            })
            .finally(() => {
                this.clearSecrets();
                this.submitting.set(false);
            });
    }

    protected loginWithGoogle(): void {
        this.auth.loginWithGoogle();
    }

    protected confirmLogout(): void {
        if (this.leaving()) {
            return;
        }
        this.leaving.set(true);
        this.dialogs.closeLogout();
        void this.auth.logout().finally(() => this.leaving.set(false));
    }

    protected dialogHeader(): string {
        if (this.mode() === 'login') {
            return 'entrar';
        }
        return 'criar conta';
    }

    protected emailAutocomplete(): string {
        if (this.mode() === 'login') {
            return 'username';
        }
        return 'email';
    }

    protected passwordAutocomplete(): string {
        if (this.mode() === 'login') {
            return 'current-password';
        }
        return 'new-password';
    }

    protected submitLabel(): string {
        if (this.mode() === 'login') {
            return 'entrar com e-mail';
        }
        return 'criar conta';
    }

    protected switchLabel(): string {
        if (this.mode() === 'login') {
            return 'criar conta';
        }
        return 'já tenho conta';
    }

    protected ariaInvalid(message: string | undefined): 'true' | null {
        if (message) {
            return 'true';
        }
        return null;
    }

    protected ariaDescribedBy(id: string, message: string | undefined): string | null {
        if (message) {
            return id;
        }
        return null;
    }

    private nextMode(): AccountMode {
        if (this.mode() === 'login') {
            return 'register';
        }
        return 'login';
    }

    private passwordRequest(value: AccountFormValue): Promise<void> {
        if (this.mode() === 'login') {
            return this.auth.login(value.email, value.password);
        }
        return this.auth.register(value.email, value.displayName, value.password);
    }

    private resetClosedLogin(): void {
        this.mode.set('login');
        this.formError.set(null);
        this.fieldErrors.set({});
        this.clearSecrets();
    }

    private clearSecrets(): void {
        this.form.controls.password.setValue('');
        this.form.controls.confirmPassword.setValue('');
    }
}

function validationErrors(mode: AccountMode, value: AccountFormValue): AccountFieldErrors {
    const errors: AccountFieldErrors = {};
    if (!isValidEmail(value.email)) {
        errors.email = 'Informe um e-mail válido.';
    }
    const password = passwordError(value.password);
    if (password) {
        errors.password = password;
    }
    if (mode === 'register') {
        const name = value.displayName.trim();
        if (name.length < 1 || name.length > 120) {
            errors.displayName = 'Informe um nome de até 120 caracteres.';
        }
        if (value.confirmPassword !== value.password) {
            errors.confirmPassword = 'A confirmação precisa ser igual à senha.';
        }
    }
    return errors;
}

function hasFieldErrors(errors: AccountFieldErrors): boolean {
    return Object.values(errors).some((message) => message !== undefined);
}

function isValidEmail(value: string): boolean {
    const email = value.trim();
    if (email.length === 0 || email.length > 320) {
        return false;
    }
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function passwordError(password: string): string | null {
    if (password.trim().length === 0) {
        return 'Informe uma senha.';
    }
    if (password.length < 8 || password.length > 128) {
        return 'A senha precisa ter de 8 a 128 caracteres.';
    }
    return null;
}
