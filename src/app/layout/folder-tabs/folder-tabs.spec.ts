import { provideLocationMocks } from '@angular/common/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../app.routes';
import { AuthState } from '../../core/auth/auth-state';
import { FolderTabs } from './folder-tabs';

describe('FolderTabs', () => {
  let fixture: ComponentFixture<FolderTabs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FolderTabs],
      providers: [provideRouter(routes), provideLocationMocks()],
    }).compileComponents();

    TestBed.inject(AuthState).setAuthenticated({
      id: 'user-1',
      email: 'ana@example.com',
      displayName: 'Ana Silva',
      avatarUrl: null,
      lastLoginAt: null,
    });
    fixture = TestBed.createComponent(FolderTabs);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders a link for every screen inside the main navigation', () => {
    const navigation = fixture.nativeElement.querySelector('nav');
    const links = navigation.querySelectorAll('a');

    expect(navigation.getAttribute('aria-label')).toBe('Navegação principal');
    expect(Array.from(links, (link) => (link as HTMLAnchorElement).textContent?.trim())).toEqual([
      'joguinhos',
      'roleta',
    ]);
  });

  it('marks the home tab as the current page', () => {
    const current = fixture.nativeElement.querySelector('[aria-current="page"]');

    expect(current?.textContent).toContain('joguinhos');
    expect(current?.classList.contains('is-active')).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it('moves the current page marker when the route changes', async () => {
    await TestBed.inject(Router).navigateByUrl('/game-roulette');
    await fixture.whenStable();
    fixture.detectChanges();

    const current = fixture.nativeElement.querySelector('[aria-current="page"]');

    expect(current?.textContent).toContain('roleta');
    expect(current?.classList.contains('is-active')).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).not.toContain('editar jogo');
  });

  it('shows an active editar jogo tab only while the edit route is open', async () => {
    const id = '4f1c0c3e-6b1a-4a1e-9c2d-1a2b3c4d5e6f';
    expect(fixture.nativeElement.textContent).not.toContain('editar jogo');

    await TestBed.inject(Router).navigateByUrl(`/games/${id}`);
    await fixture.whenStable();
    fixture.detectChanges();

    const labels = [...fixture.nativeElement.querySelectorAll('a')].map((link) =>
      (link as HTMLAnchorElement).textContent?.trim(),
    );
    const current = fixture.nativeElement.querySelector('[aria-current="page"]') as HTMLAnchorElement;

    expect(labels).toEqual(['joguinhos', 'roleta', 'novo jogo', 'editar jogo']);
    expect(current.textContent).toContain('editar jogo');
    expect(current.classList.contains('is-active')).toBe(true);
    expect(current.getAttribute('href')).toBe(`/games/${id}`);
    expect(fixture.nativeElement.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });
});
