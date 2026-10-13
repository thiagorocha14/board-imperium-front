import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { BoardGame, BoardGameCollectionItem } from '@core/board-games/board-game.model';
import { BACKEND_URL } from '@core/config/backend-url';
import { GameForm } from '@features/home/game-form/game-form';
import { RegisterGameForm } from '@features/home/game-form/register-game-form';
import { COLLECTION_SEED, placeCollection } from '@features/home/collection-layout';
import { HomePage } from '@features/home/home-page';

describe('HomePage', () => {
    const backendUrl = 'http://localhost:3000';
    const seed = 2026;
    const reloadSeed = 77;
    let seeds: number[];
    let media: { matches: boolean; listener?: (event: MediaQueryListEvent) => void };

    beforeEach(async () => {
        seeds = [seed, reloadSeed];
        media = { matches: false };
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            writable: true,
            value: () => ({
                get matches() {
                    return media.matches;
                },
                media: '(max-width: 720px)',
                addEventListener: (
                    _type: string,
                    listener: (event: MediaQueryListEvent) => void,
                ) => {
                    media.listener = listener;
                },
                removeEventListener: () => undefined,
            }),
        });

        await TestBed.configureTestingModule({
            imports: [HomePage],
            providers: [
                { provide: BACKEND_URL, useValue: backendUrl },
                { provide: COLLECTION_SEED, useValue: () => seeds.shift() ?? 0 },
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([{ path: '', title: 'nossos jogos', component: HomePage }]),
                provideLocationMocks(),
            ],
        }).compileComponents();
    });

    afterEach(() => {
        TestBed.inject(HttpTestingController).verify();
    });

    function setup(): ComponentFixture<HomePage> {
        const fixture = TestBed.createComponent(HomePage);
        fixture.detectChanges();
        return fixture;
    }

    function flush(
        games: readonly (Omit<BoardGameCollectionItem, 'id'> & { id?: string })[],
    ): void {
        const request = TestBed.inject(HttpTestingController).expectOne(
            `${backendUrl}/board-games/collection`,
        );
        expect(request.request.method).toBe('GET');
        expect(request.request.urlWithParams).toBe(`${backendUrl}/board-games/collection`);
        request.flush(
            games.map((game, index) => ({
                ...game,
                id:
                    game.id ??
                    `00000000-0000-4000-8000-${(index + 1).toString(16).padStart(12, '0')}`,
            })),
        );
    }

    it('renders one circle per game using the received order for placement', () => {
        const fixture = setup();
        expect(fixture.nativeElement.querySelector('h1.sr-only')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('.status')?.textContent).toContain(
            'carregando jogos',
        );

        const azulId = '4f1c0c3e-6b1a-4a1e-9c2d-1a2b3c4d5e6f';
        const games = [
            {
                id: azulId,
                name: 'Azul',
                level: 4,
                purchasedAt: '2024-01-15',
                imageUrl: 'https://example.com/azul.jpg',
            },
            {
                id: '8a9b0c1d-2e3f-4a5b-8c7d-6e5f4a3b2c1d',
                name: 'Catan',
                level: 2,
                purchasedAt: null,
                imageUrl: null,
            },
            {
                id: '11111111-2222-4333-8444-555555555555',
                name: 'Wingspan',
                level: 5,
                purchasedAt: '2023-12-01',
                imageUrl: 'https://example.com/wingspan.jpg',
            },
        ];
        flush(games);
        fixture.detectChanges();

        const circles = [...fixture.nativeElement.querySelectorAll('.circle')] as HTMLElement[];
        const layout = placeCollection(
            games.map((game) => game.name),
            'wide',
            seed,
        );

        expect(circles).toHaveLength(games.length);
        expect(circles.map((circle) => circle.tagName)).toEqual(['BUTTON', 'BUTTON', 'BUTTON']);
        expect(circles.map((circle) => circle.getAttribute('aria-label'))).toEqual([
            'Azul',
            'Catan',
            'Wingspan',
        ]);
        expect(circles.every((circle) => !circle.classList.contains('circle-add'))).toBe(true);
        expect(circles.every((circle) => circle.getAttribute('href') == null)).toBe(true);
        expect(circles.map((circle) => circle.style.getPropertyValue('--x'))).toEqual(
            layout.items.map((item) => item.x),
        );
        expect(circles.map((circle) => circle.style.getPropertyValue('--y'))).toEqual(
            layout.items.map((item) => item.y),
        );
        expect(fixture.nativeElement.querySelector('.cluster .fab')).toBeNull();
        expect(fixture.nativeElement.querySelector('button.fab-add')?.getAttribute('title')).toBe(
            'adicionar novo jogo',
        );
        expect(
            fixture.nativeElement.querySelector('button.fab-reorder')?.getAttribute('aria-label'),
        ).toBe('reordenar jogos');
        expect(circles.map((circle) => circle.querySelector('.name')?.textContent)).toEqual([
            'Azul',
            'Catan',
            'Wingspan',
        ]);
    });

    it('exposes the name and formatted purchase date for hover and focus', () => {
        const fixture = setup();
        flush([
            {
                name: 'Azul',
                level: 4,
                purchasedAt: '2024-01-15',
                imageUrl: 'https://example.com/azul.jpg',
            },
            {
                name: 'Catan',
                level: 2,
                purchasedAt: null,
                imageUrl: 'https://example.com/catan.jpg',
            },
        ]);
        fixture.detectChanges();

        const circles = [...fixture.nativeElement.querySelectorAll('.circle')] as HTMLElement[];
        const azul = circles[0];
        const catan = circles[1];
        if (!azul || !catan) {
            throw new Error('missing circles');
        }

        expect(azul.tagName).toBe('BUTTON');
        expect(azul.getAttribute('href')).toBeNull();
        expect(azul.hasAttribute('tabindex')).toBe(false);
        expect(azul.querySelector('.veil')?.textContent).toContain('Azul');
        expect(azul.querySelector('.date')?.textContent).toBe('15/01/2024');
        expect(catan.querySelector('.date')?.textContent).toBe('sem data de compra');
        expect(azul.textContent).not.toContain('nível');

        azul.focus();
        expect(document.activeElement).toBe(azul);
        expect(azul.querySelector('.name')?.textContent).toBe('Azul');
        expect(azul.querySelector('.date')?.textContent).toBe('15/01/2024');

        azul.click();
        fixture.detectChanges();
        expect(document.body.querySelector('.p-dialog-title')?.textContent).toContain(
            'editar jogo',
        );
        const gameId = '00000000-0000-4000-8000-000000000001';
        TestBed.inject(HttpTestingController)
            .expectOne(`${backendUrl}/board-games/${gameId}`)
            .flush(savedGame(gameId, { name: 'Azul', level: 4, purchasedAt: '2024-01-15' }));
        fixture.detectChanges();
        flushCatalog([]);
    });

    it('renders only the add-game circle when the collection is empty', () => {
        const fixture = setup();
        flush([]);
        fixture.detectChanges();

        const button = fixture.nativeElement.querySelector(
            'button.circle',
        ) as HTMLButtonElement | null;
        expect(fixture.nativeElement.querySelectorAll('.circle')).toHaveLength(1);
        expect(button?.getAttribute('aria-label')).toBe('adicionar novo jogo');
        expect(button?.getAttribute('title')).toBe('adicionar novo jogo');
        expect(button?.getAttribute('href')).toBeNull();
        expect(button?.textContent?.trim()).toBe('+');
        expect(fixture.nativeElement.querySelector('.fab')).toBeNull();
        expect(fixture.nativeElement.textContent).not.toContain('nenhum');
        expect(fixture.nativeElement.querySelector('.status')).toBeNull();
    });

    it('keeps a circle when the cover is missing or broken', () => {
        const fixture = setup();
        flush([
            { name: 'Catan', level: 2, purchasedAt: null, imageUrl: null },
            { name: 'Azul', level: 3, purchasedAt: '2020-03-05', imageUrl: '' },
            {
                name: 'Wingspan',
                level: 1,
                purchasedAt: '2022-06-09',
                imageUrl: 'https://example.com/wingspan.jpg',
            },
        ]);
        fixture.detectChanges();

        const circles = [...fixture.nativeElement.querySelectorAll('.circle')] as HTMLElement[];
        const missing = circles[0];
        const blank = circles[1];
        const broken = circles[2];
        if (!missing || !blank || !broken) {
            throw new Error('missing circles');
        }

        expect(missing.querySelector('img')).toBeNull();
        expect(missing.querySelector('.initial')?.textContent).toBe('C');
        expect(missing.querySelector('.name')?.textContent).toBe('Catan');

        expect(blank.querySelector('img')).toBeNull();
        expect(blank.querySelector('.initial')?.textContent).toBe('A');

        const image = broken.querySelector('img');
        expect(image?.getAttribute('src')).toBe('https://example.com/wingspan.jpg');
        image?.dispatchEvent(new Event('error'));
        fixture.detectChanges();

        expect(broken.querySelector('img')).toBeNull();
        expect(broken.querySelector('.initial')?.textContent).toBe('W');
        expect(broken.querySelector('.date')?.textContent).toBe('09/06/2022');
        expect(fixture.nativeElement.querySelectorAll('.circle')).toHaveLength(3);
    });

    it('shows an error notice when the collection request fails', () => {
        const fixture = setup();
        const request = TestBed.inject(HttpTestingController).expectOne(
            `${backendUrl}/board-games/collection`,
        );
        request.flush(
            { statusCode: 500, error: 'Error', message: 'falhou' },
            { status: 500, statusText: 'Server Error' },
        );
        fixture.detectChanges();

        const notice = fixture.nativeElement.querySelector('.notice.is-error');
        expect(notice?.textContent).toContain('não foi possível carregar os jogos.');
        expect(notice?.getAttribute('role')).toBe('alert');
        expect(fixture.nativeElement.querySelector('.circle')).toBeNull();
        expect(fixture.nativeElement.querySelector('a')).toBeNull();
    });

    it('repositions the same games when the viewport becomes narrow', () => {
        const fixture = setup();
        const games = [
            { name: 'Azul', level: 1, purchasedAt: null, imageUrl: null },
            { name: 'Catan', level: 1, purchasedAt: null, imageUrl: null },
            { name: 'Wingspan', level: 1, purchasedAt: null, imageUrl: null },
        ];
        flush(games);
        fixture.detectChanges();

        media.matches = true;
        media.listener?.({ matches: true, media: '(max-width: 720px)' } as MediaQueryListEvent);
        fixture.detectChanges();

        const circles = [...fixture.nativeElement.querySelectorAll('.circle')] as HTMLElement[];
        const layout = placeCollection(
            games.map((game) => game.name),
            'narrow',
            seed,
        );
        expect(circles.map((circle) => circle.style.getPropertyValue('--x'))).toEqual(
            layout.items.map((item) => item.x),
        );
    });

    describe('level filter', () => {
        const games = [
            { name: 'Azul', level: 1, purchasedAt: null, imageUrl: null },
            { name: 'Catan', level: 2, purchasedAt: null, imageUrl: null },
            { name: 'Wingspan', level: 3, purchasedAt: null, imageUrl: null },
            { name: 'Pandemic', level: 3, purchasedAt: null, imageUrl: null },
            { name: 'Splendor', level: 5, purchasedAt: null, imageUrl: null },
        ];

        function parts(fixture: ComponentFixture<HomePage>): HTMLButtonElement[] {
            return [...fixture.nativeElement.querySelectorAll('.pill-part')];
        }

        function visibleNames(fixture: ComponentFixture<HomePage>): string[] {
            return [...fixture.nativeElement.querySelectorAll('.circle .name')].map(
                (name) => (name as HTMLElement).textContent ?? '',
            );
        }

        it('renders five toggle parts under the "nosso nível" label', () => {
            const fixture = setup();
            flush(games);
            fixture.detectChanges();

            const group = fixture.nativeElement.querySelector('.pill[role="group"]') as HTMLElement;
            const labelId = group.getAttribute('aria-labelledby') ?? '';
            expect(fixture.nativeElement.querySelector(`#${labelId}`)?.textContent).toBe(
                'nosso nível',
            );
            expect(parts(fixture).map((part) => part.textContent?.trim())).toEqual([
                '1',
                '2',
                '3',
                '4',
                '5',
            ]);
            expect(
                parts(fixture).every((part) => part.getAttribute('aria-pressed') === 'false'),
            ).toBe(true);
            expect(visibleNames(fixture)).toHaveLength(games.length);
        });

        it('filters by one or more selected levels and shows everything when cleared', () => {
            const fixture = setup();
            flush(games);
            fixture.detectChanges();

            parts(fixture)[2]?.click();
            fixture.detectChanges();
            expect(parts(fixture)[2]?.getAttribute('aria-pressed')).toBe('true');
            expect(visibleNames(fixture)).toEqual(['Wingspan', 'Pandemic']);

            parts(fixture)[0]?.click();
            fixture.detectChanges();
            expect(visibleNames(fixture)).toEqual(['Azul', 'Wingspan', 'Pandemic']);

            parts(fixture)[2]?.click();
            parts(fixture)[0]?.click();
            fixture.detectChanges();
            expect(visibleNames(fixture)).toHaveLength(games.length);
        });

        it('keeps one filtered game at the center', () => {
            const fixture = setup();
            flush(games);
            fixture.detectChanges();

            parts(fixture)[4]?.click();
            fixture.detectChanges();

            const circle = fixture.nativeElement.querySelector('.circle') as HTMLElement;
            expect(visibleNames(fixture)).toEqual(['Splendor']);
            expect(circle.style.getPropertyValue('--x')).toBe('0.0000');
            expect(circle.style.getPropertyValue('--y')).toBe('0.0000');
        });

        it('says when no game matches the selected levels', () => {
            const fixture = setup();
            flush(games);
            fixture.detectChanges();

            parts(fixture)[3]?.click();
            fixture.detectChanges();

            expect(fixture.nativeElement.querySelectorAll('.circle')).toHaveLength(0);
            expect(fixture.nativeElement.querySelector('.status')?.textContent).toContain(
                'nenhum jogo nesse nível',
            );
            expect(
                fixture.nativeElement.querySelector('button.fab-add')?.getAttribute('aria-label'),
            ).toBe('adicionar novo jogo');
            expect(fixture.nativeElement.querySelector('button.fab-reorder')).not.toBeNull();
        });
    });

    describe('reload button', () => {
        const games = [
            { name: 'Azul', level: 1, purchasedAt: null, imageUrl: null },
            { name: 'Catan', level: 2, purchasedAt: null, imageUrl: null },
            { name: 'Wingspan', level: 3, purchasedAt: null, imageUrl: null },
            { name: 'Pandemic', level: 4, purchasedAt: null, imageUrl: null },
        ];

        function reloadButton(fixture: ComponentFixture<HomePage>): HTMLButtonElement {
            return fixture.nativeElement.querySelector('button.reload');
        }

        function positions(fixture: ComponentFixture<HomePage>): string[] {
            return [...fixture.nativeElement.querySelectorAll('.circle')].map((circle) => {
                const style = (circle as HTMLElement).style;
                return `${style.getPropertyValue('--x')},${style.getPropertyValue('--y')}`;
            });
        }

        it('fetches the games again without moving the circles', () => {
            const fixture = setup();
            flush(games);
            fixture.detectChanges();
            const before = positions(fixture);

            expect(reloadButton(fixture).getAttribute('aria-label')).toBe('recarregar jogos');
            reloadButton(fixture).click();
            fixture.detectChanges();
            expect(reloadButton(fixture).disabled).toBe(true);
            expect(positions(fixture)).toEqual(before);

            flush(games);
            fixture.detectChanges();

            expect(positions(fixture)).toEqual(before);
            expect(reloadButton(fixture).disabled).toBe(false);
        });

        it('keeps the selected levels after reloading', () => {
            const fixture = setup();
            flush(games);
            fixture.detectChanges();

            (fixture.nativeElement.querySelectorAll('.pill-part')[1] as HTMLButtonElement).click();
            reloadButton(fixture).click();
            flush(games);
            fixture.detectChanges();

            expect(
                [...fixture.nativeElement.querySelectorAll('.circle .name')].map(
                    (name) => (name as HTMLElement).textContent,
                ),
            ).toEqual(['Catan']);
        });

        it('shows the error notice when reloading fails', () => {
            const fixture = setup();
            flush(games);
            fixture.detectChanges();

            reloadButton(fixture).click();
            TestBed.inject(HttpTestingController)
                .expectOne(`${backendUrl}/board-games/collection`)
                .flush(null, { status: 500, statusText: 'Server Error' });
            fixture.detectChanges();

            expect(fixture.nativeElement.querySelector('.notice.is-error')?.textContent).toContain(
                'não foi possível carregar os jogos.',
            );
            expect(reloadButton(fixture).disabled).toBe(false);
        });

        it('reorders the circles from a new seed without fetching again', () => {
            vi.useFakeTimers();
            try {
                const fixture = setup();
                flush(games);
                fixture.detectChanges();
                finishShuffle(fixture);
                const before = positions(fixture);
                const button = fixture.nativeElement.querySelector(
                    'button.fab-reorder',
                ) as HTMLButtonElement;

                expect(button.getAttribute('aria-label')).toBe('reordenar jogos');
                button.click();
                fixture.detectChanges();

                expect(TestBed.inject(HttpTestingController).match(() => true)).toHaveLength(0);
                const expected = placeCollection(
                    games.map((game) => game.name),
                    'wide',
                    reloadSeed,
                ).items.map((item) => `${item.x},${item.y}`);
                expect(positions(fixture)).toEqual(expected);
                expect(positions(fixture)).not.toEqual(before);
            } finally {
                vi.useRealTimers();
            }
        });

        it('deals the circles out of a shuffled pile when the collection loads', () => {
            vi.useFakeTimers();
            try {
                const fixture = setup();
                flush(games);
                fixture.detectChanges();
                const cluster = fixture.nativeElement.querySelector('.cluster') as HTMLElement;

                expect(cluster.classList).toContain('is-gathering');

                vi.advanceTimersByTime(920);
                fixture.detectChanges();
                expect(cluster.classList).toContain('is-spreading');

                vi.advanceTimersByTime(760);
                fixture.detectChanges();
                expect(cluster.classList).not.toContain('is-gathering');
                expect(cluster.classList).not.toContain('is-spreading');
            } finally {
                vi.useRealTimers();
            }
        });

        it('shuffles the circles into a pile before spreading them out', () => {
            vi.useFakeTimers();
            try {
                const fixture = setup();
                flush(games);
                fixture.detectChanges();
                finishShuffle(fixture);
                const cluster = (): HTMLElement => fixture.nativeElement.querySelector('.cluster');
                const button = fixture.nativeElement.querySelector(
                    'button.fab-reorder',
                ) as HTMLButtonElement;

                button.click();
                fixture.detectChanges();
                expect(cluster().classList).toContain('is-gathering');
                const shuffled = positions(fixture);

                button.click();
                fixture.detectChanges();
                expect(positions(fixture)).toEqual(shuffled);

                vi.advanceTimersByTime(920);
                fixture.detectChanges();
                expect(cluster().classList).not.toContain('is-gathering');
                expect(cluster().classList).toContain('is-spreading');

                vi.advanceTimersByTime(760);
                fixture.detectChanges();
                expect(cluster().classList).not.toContain('is-spreading');
            } finally {
                vi.useRealTimers();
            }
        });
    });

    describe('game dialog', () => {
        const gameId = '4f1c0c3e-6b1a-4a1e-9c2d-1a2b3c4d5e6f';
        const categoryId = '8a9b0c1d-2e3f-4a5b-8c7d-6e5f4a3b2c1d';
        const mechanicId = '11111111-2222-4333-8444-555555555555';

        function openCreate(fixture: ComponentFixture<HomePage>): void {
            const button = fixture.nativeElement.querySelector(
                'button.circle-add, button.fab-add',
            ) as HTMLButtonElement;
            button.click();
            fixture.detectChanges();
            const http = TestBed.inject(HttpTestingController);
            http.expectOne(`${backendUrl}/ludopedia/categories`).flush({
                categories: [{ id: 4, name: 'estratégia' }],
            });
            http.expectOne(`${backendUrl}/ludopedia/mechanics`).flush({
                mechanics: [{ id: 15, name: 'draft' }],
            });
            fixture.detectChanges();
        }

        it('opens an empty form from the add circle and keeps validation inside it', () => {
            const fixture = setup();
            flush([]);
            fixture.detectChanges();

            openCreate(fixture);
            const dialog = gameDialog();
            expect(dialog.querySelector('.p-dialog-title')?.textContent).toContain(
                'adicionar novo jogo',
            );
            expect(formControls(fixture).name.value).toBe('');

            saveButton().click();
            fixture.detectChanges();

            expect(dialog.querySelector('.field-error')).not.toBeNull();
            expect(
                TestBed.inject(HttpTestingController).match(`${backendUrl}/board-games`),
            ).toHaveLength(0);
            expect(document.body.textContent).not.toContain('jogo salvo com sucesso');
        });

        it('posts a new game, closes the dialog, shows a toast and adds the circle', () => {
            const fixture = setup();
            flush([]);
            fixture.detectChanges();
            openCreate(fixture);

            const controls = formControls(fixture);
            controls.name.setValue('  Azul  ');
            controls.level.setValue(4);
            controls.complexity.setValue(2.5);
            controls.playTimeMinutes.setValue(45);
            controls.minPlayers.setValue(2);
            controls.maxPlayers.setValue(4);
            controls.categoryIds.setValue([4]);
            controls.mechanicIds.setValue([15]);
            controls.purchasedAt.setValue(null);
            controls.imageUrl.setValue('   ');
            fixture.detectChanges();
            saveButton().click();

            const request = TestBed.inject(HttpTestingController).expectOne(
                `${backendUrl}/board-games`,
            );
            expect(request.request.method).toBe('POST');
            expect(request.request.body).toEqual({
                name: 'Azul',
                level: 4,
                complexity: 2.5,
                playTimeMinutes: 45,
                minPlayers: 2,
                maxPlayers: 4,
                purchasedAt: null,
                imageUrl: null,
            });
            expect(request.request.body).not.toHaveProperty('categoryIds');
            request.flush(savedGame(gameId));
            fixture.detectChanges();

            expect(document.body.querySelector('.p-dialog')).toBeNull();
            expect(document.body.textContent).toContain('jogo salvo com sucesso');
            expect(fixture.nativeElement.querySelector('.circle .name')?.textContent).toBe('Azul');
            expect(fixture.nativeElement.querySelector('button.fab-add')).not.toBeNull();
            expect(fixture.nativeElement.querySelector('button.circle-add')).toBeNull();
        });

        it('keeps an api error inside the form', () => {
            const fixture = setup();
            flush([]);
            fixture.detectChanges();
            openCreate(fixture);
            formControls(fixture).name.setValue('Azul');
            formControls(fixture).complexity.setValue(2);
            formControls(fixture).playTimeMinutes.setValue(30);
            formControls(fixture).minPlayers.setValue(2);
            formControls(fixture).maxPlayers.setValue(4);
            fixture.detectChanges();
            saveButton().click();

            TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/board-games`).flush(
                {
                    statusCode: 409,
                    error: 'ConflictError',
                    message: 'Board game name already exists',
                },
                { status: 409, statusText: 'Conflict' },
            );
            fixture.detectChanges();

            expect(gameDialog().querySelector('.notice')?.textContent).toContain(
                'Já existe um jogo com esse nome.',
            );
            expect(document.body.querySelector('.p-dialog')).not.toBeNull();
            expect(document.body.textContent).not.toContain('jogo salvo com sucesso');
            expect(fixture.nativeElement.querySelector('.circle.circle-add')).not.toBeNull();
        });

        it('loads the selected game into the edit dialog and patches it onto the circle', () => {
            const fixture = setup();
            flush([
                { id: gameId, name: 'Azul', level: 4, purchasedAt: '2024-01-15', imageUrl: null },
            ]);
            fixture.detectChanges();

            (fixture.nativeElement.querySelector('button.circle') as HTMLButtonElement).click();
            fixture.detectChanges();
            expect(gameDialog().textContent).toContain('carregando jogo');
            expect(gameDialog().querySelector('form')).toBeNull();

            const loaded = TestBed.inject(HttpTestingController).expectOne(
                `${backendUrl}/board-games/${gameId}`,
            );
            expect(loaded.request.method).toBe('GET');
            loaded.flush(
                savedGame(gameId, {
                    purchasedAt: '2024-01-15',
                    categoryIds: [categoryId],
                    mechanicIds: [mechanicId],
                }),
            );
            fixture.detectChanges();
            flushCatalog(
                [{ id: categoryId, name: 'estratégia' }],
                [{ id: mechanicId, name: 'draft' }],
            );
            fixture.detectChanges();

            const controls = formControls(fixture);
            expect(gameDialog().querySelector('.p-dialog-title')?.textContent).toContain(
                'editar jogo',
            );
            expect(controls.name.value).toBe('Azul');
            expect(controls.purchasedAt.value).toEqual(new Date(2024, 0, 15));
            expect(controls.categoryIds.value).toEqual([categoryId]);
            expect(controls.mechanicIds.value).toEqual([mechanicId]);
            expect(
                TestBed.inject(HttpTestingController).match((candidate) =>
                    candidate.url.includes('/ludopedia/'),
                ),
            ).toEqual([]);

            saveButton().click();
            const request = TestBed.inject(HttpTestingController).expectOne(
                `${backendUrl}/board-games/${gameId}`,
            );
            expect(request.request.method).toBe('PATCH');
            expect(request.request.body).toMatchObject({
                name: 'Azul',
                purchasedAt: '2024-01-15',
                imageUrl: null,
                categoryIds: [categoryId],
                mechanicIds: [mechanicId],
            });
            request.flush(
                savedGame(gameId, {
                    name: 'Azul Mini',
                    imageUrl: 'https://example.com/azul.jpg',
                    categoryIds: [categoryId],
                    mechanicIds: [mechanicId],
                }),
            );
            fixture.detectChanges();

            expect(document.body.querySelector('.p-dialog')).toBeNull();
            expect(document.body.textContent).toContain('jogo salvo com sucesso');
            expect(fixture.nativeElement.querySelector('.circle .name')?.textContent).toBe(
                'Azul Mini',
            );
            expect(fixture.nativeElement.querySelector('.circle img')?.getAttribute('src')).toBe(
                'https://example.com/azul.jpg',
            );
        });

        it('shows a portuguese warning inside the dialog when the game is missing', () => {
            const fixture = setup();
            flush([{ id: gameId, name: 'Azul', level: 4, purchasedAt: null, imageUrl: null }]);
            fixture.detectChanges();
            (fixture.nativeElement.querySelector('button.circle') as HTMLButtonElement).click();
            fixture.detectChanges();

            TestBed.inject(HttpTestingController)
                .expectOne(`${backendUrl}/board-games/${gameId}`)
                .flush(
                    { statusCode: 404, error: 'NotFoundError', message: 'Board game not found' },
                    { status: 404, statusText: 'Not Found' },
                );
            fixture.detectChanges();

            const notice = gameDialog().querySelector('[role="alert"]');
            expect(notice?.textContent).toContain('Esse jogo não foi encontrado.');
            expect(notice?.textContent).not.toContain('Board game not found');
            expect(gameDialog().querySelector('form')).toBeNull();
        });

        it('keeps a missing category warning inside the edit form', () => {
            const fixture = setup();
            flush([{ id: gameId, name: 'Azul', level: 4, purchasedAt: null, imageUrl: null }]);
            fixture.detectChanges();
            (fixture.nativeElement.querySelector('button.circle') as HTMLButtonElement).click();
            fixture.detectChanges();
            TestBed.inject(HttpTestingController)
                .expectOne(`${backendUrl}/board-games/${gameId}`)
                .flush(savedGame(gameId, { categoryIds: [categoryId], mechanicIds: [mechanicId] }));
            fixture.detectChanges();
            flushCatalog(
                [{ id: categoryId, name: 'estratégia' }],
                [{ id: mechanicId, name: 'draft' }],
            );
            fixture.detectChanges();

            saveButton().click();
            TestBed.inject(HttpTestingController)
                .expectOne(`${backendUrl}/board-games/${gameId}`)
                .flush(
                    { statusCode: 404, error: 'NotFoundError', message: 'Category not found' },
                    { status: 404, statusText: 'Not Found' },
                );
            fixture.detectChanges();

            expect(gameDialog().querySelector('.notice')?.textContent).toContain(
                'Uma das categorias não foi encontrada.',
            );
            expect(formControls(fixture).name.value).toBe('Azul');
            expect(document.body.textContent).not.toContain('jogo salvo com sucesso');
        });
    });
});

function finishShuffle(fixture: ComponentFixture<HomePage>): void {
    vi.advanceTimersByTime(920);
    fixture.detectChanges();
    vi.advanceTimersByTime(760);
    fixture.detectChanges();
}

function gameDialog(): HTMLElement {
    const element = document.body.querySelector('.p-dialog');
    if (!(element instanceof HTMLElement)) {
        throw new Error('missing dialog');
    }
    return element;
}

function formControls(
    fixture: ComponentFixture<HomePage>,
): FormGroup<RegisterGameForm>['controls'] {
    const form = fixture.debugElement.query(By.directive(GameForm)).componentInstance as GameForm;
    return (form as unknown as { form: FormGroup<RegisterGameForm> }).form.controls;
}

function saveButton(): HTMLButtonElement {
    const button = gameDialog().querySelector('button.save');
    if (!(button instanceof HTMLButtonElement)) {
        throw new Error('missing save button');
    }
    return button;
}

function savedGame(id: string, overrides: Partial<BoardGame> = {}): BoardGame {
    return {
        id,
        name: 'Azul',
        level: 4,
        complexity: 2.5,
        playTimeMinutes: 45,
        minPlayers: 2,
        maxPlayers: 4,
        purchasedAt: null,
        imageUrl: null,
        categoryIds: [],
        mechanicIds: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        ...overrides,
    };
}

function flushCatalog(
    categories: readonly { id: string; name: string }[],
    mechanics: readonly { id: string; name: string }[] = categories,
): void {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:3000/categories').flush(categories);
    http.expectOne('http://localhost:3000/mechanics').flush(mechanics);
}
