import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../../../app/app.routes';
import { AccountDialogs } from '@core/auth/account-dialogs';
import { AuthState } from '@core/auth/auth-state';
import { AuthUser } from '@core/auth/auth-user.model';
import { HeaderActions } from '@layout/header-actions/header-actions';

const user: AuthUser = {
    id: 'user-1',
    email: 'ana@example.com',
    displayName: 'Ana Silva',
    avatarUrl: null,
    lastLoginAt: null,
};

describe('HeaderActions', () => {
    function buttons(root: HTMLElement): HTMLButtonElement[] {
        return Array.from(root.querySelectorAll('button'));
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HeaderActions],
            providers: [provideRouter(routes), provideLocationMocks()],
        }).compileComponents();
    });

    it('shows only logout beside the name while the user is signed in', () => {
        TestBed.inject(AuthState).setAuthenticated(user);
        const fixture = TestBed.createComponent(HeaderActions);
        fixture.detectChanges();

        const actions = buttons(fixture.nativeElement as HTMLElement);
        expect(actions.map((button) => button.getAttribute('aria-label'))).toEqual(['Sair']);
        expect(actions.every((button) => !button.disabled)).toBe(true);
        expect(actions.map((button) => button.dataset['tone'])).toEqual(['red']);
    });

    it('shows the name and a blue circle when the avatar is missing', () => {
        TestBed.inject(AuthState).setAuthenticated(user);
        const fixture = TestBed.createComponent(HeaderActions);
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        expect(root.querySelector('.identity-name')?.textContent).toContain('Ana Silva');
        expect(root.querySelector('img')).toBeNull();
        expect(root.querySelector('.avatar-fallback')).not.toBeNull();
    });

    it('shows the avatar and replaces it when the image fails', () => {
        TestBed.inject(AuthState).setAuthenticated({
            ...user,
            avatarUrl: 'https://example.com/ana.png',
        });
        const fixture = TestBed.createComponent(HeaderActions);
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        const image = root.querySelector('img');
        expect(image?.getAttribute('src')).toBe('https://example.com/ana.png');
        image?.dispatchEvent(new Event('error'));
        fixture.detectChanges();

        expect(root.querySelector('img')).toBeNull();
        expect(root.querySelector('.avatar-fallback')).not.toBeNull();
    });

    it('keeps logout disabled while the user is signed out', () => {
        TestBed.inject(AuthState).setUnauthenticated();
        const fixture = TestBed.createComponent(HeaderActions);
        fixture.detectChanges();

        const [login, logout] = buttons(fixture.nativeElement as HTMLElement);
        expect(login?.getAttribute('aria-label')).toBe('Entrar');
        expect(login?.disabled).toBe(false);
        expect(login?.dataset['tone']).toBe('blue');
        expect(logout?.getAttribute('aria-label')).toBe('Sair');
        expect(logout?.disabled).toBe(true);
        expect(logout?.dataset['tone']).toBe('red');
    });

    it('asks before leaving and opens the login screen from the header', async () => {
        const state = TestBed.inject(AuthState);
        state.setAuthenticated(user);
        const fixture = TestBed.createComponent(HeaderActions);
        fixture.detectChanges();

        buttons(fixture.nativeElement as HTMLElement)
            .find((button) => button.getAttribute('aria-label') === 'Sair')
            ?.click();
        expect(TestBed.inject(AccountDialogs).logoutOpen()).toBe(true);

        state.setUnauthenticated();
        fixture.detectChanges();
        buttons(fixture.nativeElement as HTMLElement)
            .find((button) => button.getAttribute('aria-label') === 'Entrar')
            ?.click();
        await fixture.whenStable();

        expect(TestBed.inject(AccountDialogs).loginOpen()).toBe(true);
        expect(TestBed.inject(Router).url).toBe('/entrar');
    });
});
