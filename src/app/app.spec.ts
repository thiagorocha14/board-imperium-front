import { provideHttpClient } from '@angular/common/http';
import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { AuthState } from './core/auth/auth-state';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideLocationMocks(), provideHttpClient()],
    }).compileComponents();

    TestBed.inject(AuthState).setAuthenticated({
      id: 'user-1',
      email: 'ana@example.com',
      displayName: 'Ana Silva',
      avatarUrl: null,
      lastLoginAt: null,
    });
  });

  it('renders the retro window shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain('nossos jogos');
    expect(compiled.querySelector('.skip-link')?.textContent).toContain('Ir para o conteúdo');
    expect(compiled.querySelector('footer')).toBeNull();
  });
});
