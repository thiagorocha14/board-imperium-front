import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../../app/app.routes';
import { AuthState } from '@core/auth/auth-state';
import { AppTitleStrategy } from '@core/title/app-title.strategy';

describe('AppTitleStrategy', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter(routes),
                provideLocationMocks(),
                { provide: TitleStrategy, useClass: AppTitleStrategy },
            ],
        });
    });

    it.each([
        ['/', 'nossos jogos'],
        ['/game-roulette', 'nossos jogos'],
        ['/register-games', 'nossos jogos'],
    ])('sets the document title for %s', async (url, expected) => {
        TestBed.inject(AuthState).setAuthenticated({
            id: 'user-1',
            email: 'ana@example.com',
            displayName: 'Ana Silva',
            avatarUrl: null,
            lastLoginAt: null,
        });
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl(url);
        expect(TestBed.inject(Title).getTitle()).toBe(expected);
    });
});
