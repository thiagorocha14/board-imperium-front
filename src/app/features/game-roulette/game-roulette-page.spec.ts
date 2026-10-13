import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ActivatedRoute } from '@angular/router';
import { BoardGame } from '../../core/board-games/board-game.model';
import { BACKEND_URL } from '../../core/config/backend-url';
import { GameRoulettePage, orderReels } from './game-roulette-page';

describe('GameRoulettePage', () => {
  const backendUrl = 'http://localhost:3000';
  const categoryId = '4f1c0c3e-6b1a-4a1e-9c2d-1a2b3c4d5e6f';
  const mechanicId = '8a9b0c1d-2e3f-4a5b-8c7d-6e5f4a3b2c1d';
  let media: { matches: boolean };

  beforeEach(async () => {
    media = { matches: false };
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => ({
        get matches() {
          return media.matches;
        },
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    });

    await TestBed.configureTestingModule({
      imports: [GameRoulettePage],
      providers: [
        { provide: BACKEND_URL, useValue: backendUrl },
        { provide: ActivatedRoute, useValue: { snapshot: { title: 'roleta de jogatina' } } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.inject(HttpTestingController).verify();
  });

  function setup(): ComponentFixture<GameRoulettePage> {
    const fixture = TestBed.createComponent(GameRoulettePage);
    fixture.detectChanges();
    flushCatalog();
    fixture.detectChanges();
    return fixture;
  }

  function flushCatalog(): void {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${backendUrl}/categories`).flush([
      { id: categoryId, name: 'estratégia', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    ]);
    http.expectOne(`${backendUrl}/mechanics`).flush([
      {
        id: mechanicId,
        name: 'draft',
        description: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  }

  function labels(fixture: ComponentFixture<GameRoulettePage>): string[] {
    return [...fixture.nativeElement.querySelectorAll('button.criterion')].map((button) =>
      (button as HTMLButtonElement).textContent?.trim(),
    ) as string[];
  }

  function panes(fixture: ComponentFixture<GameRoulettePage>): HTMLElement[] {
    return [...fixture.nativeElement.querySelectorAll('.pane')];
  }

  function lever(fixture: ComponentFixture<GameRoulettePage>): HTMLButtonElement {
    const button = fixture.nativeElement.querySelector('button.lever');
    if (!(button instanceof HTMLButtonElement)) throw new Error('missing lever');
    return button;
  }

  function dialog(): HTMLElement {
    const element = document.body.querySelector('.p-dialog');
    if (!(element instanceof HTMLElement)) throw new Error('missing dialog');
    return element;
  }

  function clickText(root: ParentNode, text: string): void {
    const button = [...root.querySelectorAll('button')].find(
      (candidate) => candidate.textContent?.trim() === text,
    );
    if (!(button instanceof HTMLButtonElement)) throw new Error(`missing ${text}`);
    button.click();
  }

  it('opens with three level columns and adds or removes without leaving zero or passing six', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('h1.sr-only')?.textContent).toContain(
      'roleta de jogatina',
    );
    expect(labels(fixture)).toEqual(['nível 1', 'nível 3', 'nível 5']);
    expect(panes(fixture).map((pane) => pane.textContent?.trim())).toEqual(['7', '7', '7']);

    const add = fixture.nativeElement.querySelector('button.add') as HTMLButtonElement;
    const addThroughDialog = (): void => {
      add.click();
      fixture.detectChanges();
      clickText(dialog(), 'confirmar');
      fixture.detectChanges();
    };

    add.click();
    fixture.detectChanges();
    expect(dialog().textContent).toContain('nova coluna');
    expect(labels(fixture)).toEqual(['nível 1', 'nível 3', 'nível 5']);
    clickText(dialog(), 'cancelar');
    fixture.detectChanges();
    expect(labels(fixture)).toEqual(['nível 1', 'nível 3', 'nível 5']);

    add.click();
    fixture.detectChanges();
    const level = dialog().querySelector('select');
    if (!(level instanceof HTMLSelectElement)) throw new Error('missing level select');
    expect(level.value).toBe('1');
    level.value = '2';
    level.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    clickText(dialog(), 'confirmar');
    fixture.detectChanges();
    expect(labels(fixture)).toEqual(['nível 1', 'nível 2', 'nível 3', 'nível 5']);

    const removes = (): HTMLButtonElement[] => [
      ...fixture.nativeElement.querySelectorAll('button.remove'),
    ];
    removes()[0]?.click();
    fixture.detectChanges();
    expect(labels(fixture)).toEqual(['nível 2', 'nível 3', 'nível 5']);

    while (removes().length > 1) {
      removes()[0]?.click();
      fixture.detectChanges();
    }
    expect(removes()[0]?.disabled).toBe(true);
    removes()[0]?.click();
    fixture.detectChanges();
    expect(labels(fixture)).toEqual(['nível 5']);

    for (let count = labels(fixture).length; count < 6; count += 1) addThroughDialog();
    expect(labels(fixture)).toHaveLength(6);
    expect(add.disabled).toBe(true);
    add.click();
    fixture.detectChanges();
    expect(labels(fixture)).toHaveLength(6);
  });

  it('updates the column label from the criterion dialog and discards a cancel', () => {
    const fixture = setup();
    const criteria = (): HTMLButtonElement[] => [
      ...fixture.nativeElement.querySelectorAll('button.criterion'),
    ];

    criteria()[1]?.click();
    fixture.detectChanges();
    expect(dialog().querySelector('.p-dialog-title')?.textContent).toContain('critério da coluna 2');

    const level = dialog().querySelector('select');
    if (!(level instanceof HTMLSelectElement)) throw new Error('missing level select');
    expect(level.value).toBe('3');
    dialog().querySelector<HTMLInputElement>('input[value="category"]')?.click();
    fixture.detectChanges();
    dialog().querySelector<HTMLInputElement>('input[value="level"]')?.click();
    fixture.detectChanges();
    const restored = dialog().querySelector('select');
    if (!(restored instanceof HTMLSelectElement)) throw new Error('missing level select');
    expect(restored.value).toBe('3');
    restored.value = '4';
    restored.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    clickText(dialog(), 'cancelar');
    fixture.detectChanges();
    expect(labels(fixture)).toEqual(['nível 1', 'nível 3', 'nível 5']);

    criteria()[1]?.click();
    fixture.detectChanges();
    const again = dialog().querySelector('select');
    if (!(again instanceof HTMLSelectElement)) throw new Error('missing level select');
    again.value = '4';
    again.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    clickText(dialog(), 'confirmar');
    fixture.detectChanges();
    expect(labels(fixture)).toEqual(['nível 1', 'nível 4', 'nível 5']);

    criteria()[0]?.click();
    fixture.detectChanges();
    dialog().querySelector<HTMLInputElement>('input[value="category"]')?.click();
    fixture.detectChanges();
    const category = dialog().querySelector('select');
    if (!(category instanceof HTMLSelectElement)) throw new Error('missing category select');
    expect([...category.options].map((option) => option.textContent?.trim())).toContain('estratégia');
    category.value = categoryId;
    category.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    clickText(dialog(), 'confirmar');
    fixture.detectChanges();
    expect(labels(fixture)[0]).toBe('estratégia');

    criteria()[2]?.click();
    fixture.detectChanges();
    dialog().querySelector<HTMLInputElement>('input[value="mechanic"]')?.click();
    fixture.detectChanges();
    const mechanic = dialog().querySelector('select');
    if (!(mechanic instanceof HTMLSelectElement)) throw new Error('missing mechanic select');
    mechanic.value = mechanicId;
    mechanic.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    clickText(dialog(), 'confirmar');
    fixture.detectChanges();
    expect(labels(fixture)[2]).toBe('draft');
  });

  it('places a new column in order and leaves an edited column where it is', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('button.sort-columns')).toBeNull();
    expect(labels(fixture)).toEqual(['nível 1', 'nível 3', 'nível 5']);

    const criteria = (): HTMLButtonElement[] => [
      ...fixture.nativeElement.querySelectorAll('button.criterion'),
    ];
    criteria()[0]?.click();
    fixture.detectChanges();
    dialog().querySelector<HTMLInputElement>('input[value="category"]')?.click();
    fixture.detectChanges();
    const category = dialog().querySelector('select');
    if (!(category instanceof HTMLSelectElement)) throw new Error('missing category select');
    category.value = categoryId;
    category.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    clickText(dialog(), 'confirmar');
    fixture.detectChanges();
    expect(labels(fixture)).toEqual(['estratégia', 'nível 3', 'nível 5']);

    const add = fixture.nativeElement.querySelector('button.add') as HTMLButtonElement;
    add.click();
    fixture.detectChanges();
    const level = dialog().querySelector('select');
    if (!(level instanceof HTMLSelectElement)) throw new Error('missing level select');
    level.value = '4';
    level.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    clickText(dialog(), 'confirmar');
    fixture.detectChanges();
    expect(labels(fixture)).toEqual(['nível 3', 'nível 4', 'nível 5', 'estratégia']);
  });

  it('spins each reel on its own clock and keeps a failed column from blocking the others', () => {
    vi.useFakeTimers();
    const fixture = setup();
    const criteria = (): HTMLButtonElement[] => [
      ...fixture.nativeElement.querySelectorAll('button.criterion'),
    ];
    criteria()[1]?.click();
    fixture.detectChanges();
    dialog().querySelector<HTMLInputElement>('input[value="category"]')?.click();
    fixture.detectChanges();
    const category = dialog().querySelector('select');
    if (!(category instanceof HTMLSelectElement)) throw new Error('missing category select');
    category.value = categoryId;
    category.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    clickText(dialog(), 'confirmar');
    fixture.detectChanges();

    criteria()[2]?.click();
    fixture.detectChanges();
    dialog().querySelector<HTMLInputElement>('input[value="mechanic"]')?.click();
    fixture.detectChanges();
    const mechanic = dialog().querySelector('select');
    if (!(mechanic instanceof HTMLSelectElement)) throw new Error('missing mechanic select');
    mechanic.value = mechanicId;
    mechanic.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    clickText(dialog(), 'confirmar');
    fixture.detectChanges();

    lever(fixture).click();
    fixture.detectChanges();
    expect(lever(fixture).disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.machine')?.classList.contains('is-down')).toBe(
      true,
    );
    expect(drawRequests()).toHaveLength(0);

    vi.advanceTimersByTime(399);
    expect(drawRequests()).toHaveLength(0);
    vi.advanceTimersByTime(1);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.machine')?.classList.contains('is-down')).toBe(
      false,
    );
    const requests = drawRequests();
    expect(requests).toHaveLength(3);
    expect(requests.map((request) => request.request.params.keys())).toEqual([
      ['level'],
      ['categoryId'],
      ['mechanicId'],
    ]);
    expect(requests[0]?.request.params.get('level')).toBe('1');
    expect(requests[1]?.request.params.get('categoryId')).toBe(categoryId);
    expect(requests[2]?.request.params.get('mechanicId')).toBe(mechanicId);
    expect(requests.every((request) => request.request.params.keys().length === 1)).toBe(true);
    expect(panes(fixture).every((pane) => pane.querySelector('.strip'))).toBe(true);
    expect(panes(fixture).every((pane) => !pane.textContent?.includes('Azul'))).toBe(true);

    lever(fixture).click();
    expect(drawRequests()).toHaveLength(0);
    expect(
      [...fixture.nativeElement.querySelectorAll('button.criterion, button.add, button.remove')].every(
        (button) => (button as HTMLButtonElement).disabled,
      ),
    ).toBe(true);

    requests[0]?.flush(game('Azul', { level: 1, minPlayers: 2, maxPlayers: 4, playTimeMinutes: 30 }));
    vi.advanceTimersByTime(1599);
    fixture.detectChanges();
    expect(panes(fixture)[0]?.textContent).not.toContain('Azul');

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(panes(fixture)[0]?.textContent).toContain('Azul');
    expect(panes(fixture)[0]?.textContent).toContain('nível 1');
    expect(panes(fixture)[0]?.textContent).toContain('2–4 jogadores');
    expect(panes(fixture)[0]?.textContent).toContain('30 min');
    expect(panes(fixture)[1]?.querySelector('.strip')).not.toBeNull();

    vi.advanceTimersByTime(800);
    fixture.detectChanges();
    expect(panes(fixture)[1]?.querySelector('.strip')).not.toBeNull();
    requests[1]?.flush({ statusCode: 404, error: 'NotFound', message: 'missing' }, {
      status: 404,
      statusText: 'Not Found',
    });
    fixture.detectChanges();
    expect(panes(fixture)[1]?.textContent).toContain('nenhum jogo com esse critério');
    expect(panes(fixture)[0]?.textContent).toContain('Azul');
    expect(panes(fixture)[2]?.querySelector('.strip')).not.toBeNull();
    expect(lever(fixture).disabled).toBe(true);

    vi.advanceTimersByTime(800);
    fixture.detectChanges();
    expect(panes(fixture)[2]?.querySelector('.strip')).not.toBeNull();
    requests[2]?.flush(
      game('Wingspan', {
        imageUrl: 'https://example.com/wingspan.jpg',
        level: 5,
        minPlayers: 1,
        maxPlayers: 5,
        playTimeMinutes: 70,
      }),
    );
    fixture.detectChanges();

    const wingspan = panes(fixture)[2];
    expect(wingspan?.textContent).toContain('Wingspan');
    expect(wingspan?.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.com/wingspan.jpg',
    );
    expect(lever(fixture).disabled).toBe(false);

    wingspan?.querySelector('img')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(wingspan?.querySelector('img')).toBeNull();
    expect(wingspan?.querySelector('.mark')?.textContent).toBe('W');
    expect(wingspan?.textContent).toContain('Wingspan');
    vi.useRealTimers();
  });

  it('reveals a reduced-motion reel as soon as its response arrives', () => {
    media.matches = true;
    const fixture = setup();
    lever(fixture).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.machine')?.classList.contains('is-down')).toBe(
      false,
    );
    expect(fixture.nativeElement.querySelector('.strip')).toBeNull();
    const requests = drawRequests();
    expect(requests).toHaveLength(3);

    requests[2]?.flush(game('Wingspan'));
    fixture.detectChanges();
    expect(panes(fixture)[2]?.textContent).toContain('Wingspan');
    expect(panes(fixture)[0]?.textContent).not.toContain('Azul');
    expect(lever(fixture).disabled).toBe(true);

    requests[0]?.flush(game('Azul'));
    requests[1]?.flush(
      { statusCode: 500, error: 'Error', message: 'falhou' },
      { status: 500, statusText: 'Server Error' },
    );
    fixture.detectChanges();
    expect(panes(fixture)[0]?.textContent).toContain('Azul');
    expect(panes(fixture)[1]?.textContent).toContain('não foi possível sortear');
    expect(lever(fixture).disabled).toBe(false);
  });

  it('cancels a draw that is still in flight when the page is destroyed', () => {
    vi.useFakeTimers();
    const fixture = setup();
    lever(fixture).click();
    vi.advanceTimersByTime(400);
    const requests = drawRequests();
    expect(requests).toHaveLength(3);

    requests[0]?.flush(game('Azul'));
    fixture.destroy();

    expect(requests.slice(1).every((request) => request.cancelled)).toBe(true);
    vi.advanceTimersByTime(5000);
    expect(fixture.nativeElement.querySelector('.pane')?.textContent ?? '').not.toContain('Azul');
    vi.useRealTimers();
  });
});

describe('orderReels', () => {
  const family = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const abstract = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const strategy = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const draft = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const allocation = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const missing = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

  function reel(
    mode: 'level' | 'category' | 'mechanic',
    value: number | string | null,
  ): { id: string; criterion: { mode: 'level' | 'category' | 'mechanic'; level: number; categoryId: string | null; mechanicId: string | null } } {
    const id = `${mode}-${String(value)}`;
    return {
      id,
      criterion: {
        mode,
        level: mode === 'level' && typeof value === 'number' ? value : 1,
        categoryId: mode === 'category' && typeof value === 'string' ? value : null,
        mechanicId: mode === 'mechanic' && typeof value === 'string' ? value : null,
      },
    };
  }

  const names = {
    categoriesReady: true,
    mechanicsReady: true,
    categoryName: (id: string) =>
      ({ [family]: 'Família', [abstract]: 'abstrato', [strategy]: 'Estratégia' })[id] ?? null,
    mechanicName: (id: string) =>
      ({ [draft]: 'draft', [allocation]: 'Alocação' })[id] ?? null,
  };

  it('puts higher levels first, then categories and mechanics by name', () => {
    const input = [
      reel('mechanic', draft),
      reel('level', 1),
      reel('category', family),
      reel('level', 5),
      reel('mechanic', allocation),
      reel('category', abstract),
      reel('level', 4),
      reel('category', strategy),
    ];

    expect(orderReels(input, names).map((item) => item.id)).toEqual([
      'level-1',
      'level-4',
      'level-5',
      `category-${abstract}`,
      `category-${strategy}`,
      `category-${family}`,
      `mechanic-${allocation}`,
      `mechanic-${draft}`,
    ]);
  });

  it('keeps ties and sends unresolved names to the end of their group', () => {
    const sameLevel = [reel('level', 3), reel('level', 3), reel('level', 2)];
    sameLevel[0] = { ...sameLevel[0], id: 'first-three' };
    sameLevel[1] = { ...sameLevel[1], id: 'second-three' };
    expect(orderReels(sameLevel, names).map((item) => item.id)).toEqual([
      'level-2',
      'first-three',
      'second-three',
    ]);

    const categories = [
      reel('category', strategy),
      reel('category', null),
      reel('category', missing),
      reel('category', abstract),
    ];
    expect(orderReels(categories, names).map((item) => item.id)).toEqual([
      `category-${abstract}`,
      `category-${strategy}`,
      'category-null',
      `category-${missing}`,
    ]);

    expect(
      orderReels(categories, { ...names, categoriesReady: false }).map((item) => item.id),
    ).toEqual(categories.map((item) => item.id));
  });
});

function drawRequests() {
  return TestBed.inject(HttpTestingController).match(
    (request) => request.url === 'http://localhost:3000/board-games/draw',
  );
}

function game(name: string, overrides: Partial<BoardGame> = {}): BoardGame {
  return {
    id: name,
    name,
    level: 3,
    complexity: 2,
    playTimeMinutes: 45,
    minPlayers: 2,
    maxPlayers: 4,
    purchasedAt: null,
    imageUrl: null,
    categoryIds: [],
    mechanicIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
