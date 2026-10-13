import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import {
    BoardGame,
    BoardGameCollectionItem,
    BoardGameDrawQuery,
} from '@core/board-games/board-game.model';
import { BoardGameService } from '@core/board-games/board-game.service';
import { CatalogEntry } from '@core/catalog/catalog.model';
import { CatalogService } from '@core/catalog/catalog.service';
import { readApiError } from '@core/http/api-error';
import { CriterionDialog } from '@features/game-roulette/criterion-dialog/criterion-dialog';
import { RouletteMachine } from '@features/game-roulette/roulette-machine/roulette-machine';
import {
    Criterion,
    CriterionMode,
    LoadState,
    ReelState,
    SpinCover,
} from '@features/game-roulette/roulette.model';

const MAX_COLUMNS = 6;
const LEVER_DOWN_MS = 400;
const FIRST_REEL_MS = 2400;
const REEL_STEP_MS = 900;
const SPIN_COVER_COUNT = 8;
const NEW_COLUMN = 0;
const SPIN_CARD_MS = 140;
const SPIN_PHASE_STEP = 0.4;

const MODE_RANK: Record<CriterionMode, number> = {
    level: 0,
    category: 1,
    mechanic: 2,
};

const REEL_NAME_ORDER = new Intl.Collator('pt-BR', { sensitivity: 'accent' });

type Arrival =
    | { readonly ok: true; readonly game: BoardGame }
    | { readonly ok: false; readonly message: string };

@Component({
    selector: 'app-game-roulette-page',
    imports: [CriterionDialog, RouletteMachine],
    templateUrl: './game-roulette-page.html',
    styleUrl: './game-roulette-page.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameRoulettePage {
    private readonly boardGames = inject(BoardGameService);
    private readonly catalog = inject(CatalogService);
    private readonly destroyRef = inject(DestroyRef);

    private nextId = 4;
    private roundId = 0;
    private readonly timers = new Set<ReturnType<typeof setTimeout>>();

    protected readonly title = inject(ActivatedRoute).snapshot.title ?? '';
    protected readonly levels = [1, 2, 3, 4, 5] as const;
    protected readonly maxColumns = MAX_COLUMNS;
    protected readonly reels = signal<readonly ReelState[]>([
        createReel(1, 1),
        createReel(2, 3),
        createReel(3, 5),
    ]);
    protected readonly categories = signal<readonly CatalogEntry[]>([]);
    protected readonly mechanics = signal<readonly CatalogEntry[]>([]);
    protected readonly categoriesState = signal<LoadState>('loading');
    protected readonly mechanicsState = signal<LoadState>('loading');
    protected readonly collection = signal<readonly BoardGameCollectionItem[]>([]);
    protected readonly drawing = signal(false);
    protected readonly leverDown = signal(false);
    protected readonly reducedMotion = signal(false);
    protected readonly editingId = signal<number | null>(null);
    protected readonly draft = signal<Criterion>(levelCriterion(1));

    protected readonly columnViews = computed(() =>
        this.reels().map((reel, index) => ({
            reel,
            label: this.criterionLabel(reel),
            number: this.columnNumber(reel.id),
            duration: this.spinDuration(reel),
            delay: this.spinDelay(index),
            expanded: this.editingId() === reel.id,
        })),
    );

    protected readonly dialogHeader = computed(() => {
        const id = this.editingId();
        if (id === NEW_COLUMN) {
            return 'nova coluna';
        }
        const index = this.reels().findIndex((reel) => reel.id === id);
        if (index < 0) {
            return 'critério';
        }
        return `critério da coluna ${index + 1}`;
    });

    constructor() {
        this.destroyRef.onDestroy(() => this.invalidate());
        this.watchMotion();
        this.loadCatalog();
        this.loadCollection();
    }

    protected criterionLabel(reel: ReelState): string {
        const criterion = reel.criterion;
        if (criterion.mode === 'category') {
            const name = this.categories().find((item) => item.id === criterion.categoryId)?.name;
            return name ?? 'categoria';
        }
        if (criterion.mode === 'mechanic') {
            return (
                this.mechanics().find((item) => item.id === criterion.mechanicId)?.name ??
                'mecânica'
            );
        }
        return `nível ${criterion.level}`;
    }

    protected columnNumber(id: number): number {
        return this.reels().findIndex((reel) => reel.id === id) + 1;
    }

    protected draftReady(): boolean {
        const draft = this.draft();
        if (draft.mode === 'level') {
            return this.levels.some((level) => level === draft.level);
        }
        if (draft.mode === 'category') {
            return this.categories().some((item) => item.id === draft.categoryId);
        }
        return this.mechanics().some((item) => item.id === draft.mechanicId);
    }

    protected openNewColumn(): void {
        if (this.drawing() || this.reels().length >= MAX_COLUMNS) {
            return;
        }
        this.draft.set(levelCriterion(1));
        this.editingId.set(NEW_COLUMN);
    }

    protected removeColumn(id: number): void {
        if (this.drawing() || this.reels().length <= 1) {
            return;
        }
        this.reels.update((list) => list.filter((reel) => reel.id !== id));
    }

    protected openCriterion(id: number): void {
        if (this.drawing()) {
            return;
        }
        const reel = this.reels().find((item) => item.id === id);
        if (!reel) {
            return;
        }
        this.draft.set({ ...reel.criterion });
        this.editingId.set(id);
    }

    protected onCriterionVisible(open: boolean): void {
        if (!open) {
            this.editingId.set(null);
        }
    }

    protected setMode(mode: CriterionMode): void {
        this.draft.update((current) => ({ ...current, mode }));
    }

    protected setLevel(event: Event): void {
        if (!(event.target instanceof HTMLSelectElement)) {
            return;
        }
        const value = Number(event.target.value);
        if (!this.levels.some((level) => level === value)) {
            return;
        }
        this.draft.update((current) => ({ ...current, level: value }));
    }

    protected setCategory(event: Event): void {
        if (!(event.target instanceof HTMLSelectElement)) {
            return;
        }
        const value = event.target.value;
        this.draft.update((current) => ({ ...current, categoryId: value || null }));
    }

    protected setMechanic(event: Event): void {
        if (!(event.target instanceof HTMLSelectElement)) {
            return;
        }
        const value = event.target.value;
        this.draft.update((current) => ({ ...current, mechanicId: value || null }));
    }

    protected confirmCriterion(): void {
        const id = this.editingId();
        if (id == null || this.drawing() || !this.draftReady()) {
            return;
        }
        const next = this.draft();
        this.editingId.set(null);
        if (id === NEW_COLUMN) {
            if (this.reels().length >= MAX_COLUMNS) {
                return;
            }
            const reel: ReelState = { ...createReel(this.nextId, 1), criterion: { ...next } };
            this.nextId += 1;
            this.reels.update((list) => this.orderedReels([...list, reel]));
            return;
        }
        this.reels.update((list) =>
            list.map((reel) => {
                if (reel.id === id) {
                    return { ...reel, criterion: { ...next } };
                }
                return reel;
            }),
        );
    }

    private orderedReels(list: readonly ReelState[]): ReelState[] {
        const categoriesReady = this.categoriesState() === 'ready';
        const mechanicsReady = this.mechanicsState() === 'ready';
        const categories = this.categories();
        const mechanics = this.mechanics();
        return orderReels(list, {
            categoriesReady,
            mechanicsReady,
            categoryName: (id) => categories.find((item) => item.id === id)?.name ?? null,
            mechanicName: (id) => mechanics.find((item) => item.id === id)?.name ?? null,
        });
    }

    protected cancelCriterion(): void {
        this.editingId.set(null);
    }

    protected pull(): void {
        if (this.drawing()) {
            return;
        }
        const round = ++this.roundId;
        this.drawing.set(true);
        const columns = this.reels();
        if (this.reducedMotion()) {
            this.spin(round, columns, true);
            return;
        }
        this.leverDown.set(true);
        this.schedule(LEVER_DOWN_MS, () => {
            if (round !== this.roundId) {
                return;
            }
            this.leverDown.set(false);
            this.spin(round, columns, false);
        });
    }

    protected redraw(id: number): void {
        if (this.drawing()) {
            return;
        }
        const column = this.reels().find((reel) => reel.id === id);
        if (!column) {
            return;
        }
        const round = ++this.roundId;
        this.drawing.set(true);
        this.spin(round, [column], this.reducedMotion());
    }

    protected markBroken(id: number): void {
        this.reels.update((list) =>
            list.map((reel) => {
                if (reel.id === id) {
                    return { ...reel, broken: true };
                }
                return reel;
            }),
        );
    }

    protected spinDuration(reel: ReelState): string {
        return `${Math.max(1, reel.spinCovers.length) * SPIN_CARD_MS}ms`;
    }

    protected spinDelay(index: number): string {
        const phase = (index * SPIN_PHASE_STEP) % 1;
        return `-${Math.round(phase * SPIN_CARD_MS)}ms`;
    }

    private loadCatalog(): void {
        this.catalog
            .listCategories()
            .pipe(takeUntilDestroyed())
            .subscribe({
                next: (items) => {
                    this.categories.set(items);
                    this.categoriesState.set('ready');
                },
                error: () => this.categoriesState.set('error'),
            });
        this.catalog
            .listMechanics()
            .pipe(takeUntilDestroyed())
            .subscribe({
                next: (items) => {
                    this.mechanics.set(items);
                    this.mechanicsState.set('ready');
                },
                error: () => this.mechanicsState.set('error'),
            });
    }

    private loadCollection(): void {
        this.boardGames
            .listCollection()
            .pipe(takeUntilDestroyed())
            .subscribe({
                next: (games) => this.collection.set(games),
                error: () => this.collection.set([]),
            });
    }

    private watchMotion(): void {
        if (typeof matchMedia !== 'function') {
            return;
        }
        const query = matchMedia('(prefers-reduced-motion: reduce)');
        this.reducedMotion.set(query.matches);
        const onChange = (event: MediaQueryListEvent): void => {
            this.reducedMotion.set(event.matches);
        };
        query.addEventListener('change', onChange);
        this.destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
    }

    private spin(round: number, columns: readonly ReelState[], reduced: boolean): void {
        const ids = new Set(columns.map((column) => column.id));
        this.reels.update((list) =>
            list.map((reel) => {
                if (!ids.has(reel.id)) {
                    return reel;
                }
                return {
                    ...reel,
                    phase: 'spinning' as const,
                    game: null,
                    message: null,
                    broken: false,
                    spinCovers: makeSpinCovers(this.collection(), reel.id + round),
                };
            }),
        );

        columns.forEach((column) => {
            const query = toDrawQuery(column.criterion);
            let arrival: Arrival | null = null;
            let elapsed = reduced;

            const trySettle = (): void => {
                if (round !== this.roundId || arrival == null || !elapsed) {
                    return;
                }
                this.settle(round, column.id, arrival);
            };

            if (!reduced) {
                const reelIndex = this.reels().findIndex((reel) => reel.id === column.id);
                this.schedule(FIRST_REEL_MS + Math.max(0, reelIndex) * REEL_STEP_MS, () => {
                    elapsed = true;
                    trySettle();
                });
            }

            if (query == null) {
                arrival = { ok: false, message: 'não foi possível sortear' };
                trySettle();
                return;
            }

            this.boardGames
                .draw(query)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (game) => {
                        arrival = { ok: true, game };
                        trySettle();
                    },
                    error: (error: unknown) => {
                        arrival = { ok: false, message: drawErrorMessage(error) };
                        trySettle();
                    },
                });
        });
    }

    private settle(round: number, id: number, arrival: Arrival): void {
        if (round !== this.roundId) {
            return;
        }
        this.reels.update((list) =>
            list.map((reel) => {
                if (reel.id !== id) {
                    return reel;
                }
                if (arrival.ok) {
                    return {
                        ...reel,
                        phase: 'result',
                        game: arrival.game,
                        message: null,
                        broken: false,
                    };
                }
                return {
                    ...reel,
                    phase: 'error',
                    game: null,
                    message: arrival.message,
                    broken: false,
                };
            }),
        );
        if (this.reels().every((reel) => reel.phase !== 'spinning')) {
            this.drawing.set(false);
        }
    }

    private schedule(ms: number, task: () => void): void {
        const timer = setTimeout(() => {
            this.timers.delete(timer);
            task();
        }, ms);
        this.timers.add(timer);
    }

    private invalidate(): void {
        this.roundId += 1;
        for (const timer of this.timers) {
            clearTimeout(timer);
        }
        this.timers.clear();
    }
}

function createReel(id: number, level: number): ReelState {
    return {
        id,
        criterion: levelCriterion(level),
        phase: 'idle',
        game: null,
        message: null,
        broken: false,
        spinCovers: [],
    };
}

function levelCriterion(level: number): Criterion {
    return { mode: 'level', level, categoryId: null, mechanicId: null };
}

function toDrawQuery(criterion: Criterion): BoardGameDrawQuery | null {
    if (criterion.mode === 'level') {
        return { level: criterion.level };
    }
    if (criterion.mode === 'category') {
        if (criterion.categoryId == null) {
            return null;
        }
        return { categoryId: criterion.categoryId };
    }
    if (criterion.mechanicId == null) {
        return null;
    }
    return { mechanicId: criterion.mechanicId };
}

function drawErrorMessage(error: unknown): string {
    let status = readApiError(error)?.statusCode ?? 0;
    if (error instanceof HttpErrorResponse) {
        status = error.status;
    }
    if (status === 404) {
        return 'nenhum jogo com esse critério';
    }
    return 'não foi possível sortear';
}

function coverUrl(value: string | null): string | null {
    if (value == null) {
        return null;
    }
    const trimmed = value.trim();
    if (trimmed.length > 0) {
        return trimmed;
    }
    return null;
}

function makeSpinCovers(
    collection: readonly BoardGameCollectionItem[],
    seed: number,
): readonly SpinCover[] {
    const covers = collection
        .map((game, index) => ({
            key: `${index}-${game.name}`,
            imageUrl: coverUrl(game.imageUrl),
        }))
        .filter((item): item is SpinCover & { imageUrl: string } => item.imageUrl !== null);
    if (covers.length === 0) {
        return Array.from({ length: 4 }, (_, index) => ({
            key: `placeholder-${index}`,
            imageUrl: null,
        }));
    }
    return covers
        .map((item, index) => ({ item, order: pseudoRandom(seed + index * 97) }))
        .sort((left, right) => left.order - right.order)
        .slice(0, SPIN_COVER_COUNT)
        .map(({ item }) => item);
}

function pseudoRandom(seed: number): number {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
}

export interface ReelNameLookup {
    readonly categoriesReady: boolean;
    readonly mechanicsReady: boolean;
    readonly categoryName: (id: string) => string | null;
    readonly mechanicName: (id: string) => string | null;
}

export function orderReels<T extends { readonly criterion: Criterion }>(
    reels: readonly T[],
    names: ReelNameLookup,
): T[] {
    return reels
        .map((reel, index) => ({ reel, index }))
        .sort(
            (left, right) =>
                compareReels(left.reel.criterion, right.reel.criterion, names) ||
                left.index - right.index,
        )
        .map((entry) => entry.reel);
}

function compareReels(left: Criterion, right: Criterion, names: ReelNameLookup): number {
    const byMode = MODE_RANK[left.mode] - MODE_RANK[right.mode];
    if (byMode !== 0) {
        return byMode;
    }
    if (left.mode === 'level') {
        return left.level - right.level;
    }
    const leftName = resolvedReelName(left, names);
    const rightName = resolvedReelName(right, names);
    if (leftName == null && rightName == null) {
        return 0;
    }
    if (leftName == null) {
        return 1;
    }
    if (rightName == null) {
        return -1;
    }
    return REEL_NAME_ORDER.compare(leftName, rightName);
}

function resolvedReelName(criterion: Criterion, names: ReelNameLookup): string | null {
    if (criterion.mode === 'level') {
        return null;
    }
    let ready = names.mechanicsReady;
    if (criterion.mode === 'category') {
        ready = names.categoriesReady;
    }
    if (!ready) {
        return null;
    }
    let id = criterion.mechanicId;
    if (criterion.mode === 'category') {
        id = criterion.categoryId;
    }
    if (id == null) {
        return null;
    }
    let label = names.mechanicName(id);
    if (criterion.mode === 'category') {
        label = names.categoryName(id);
    }
    const trimmed = label?.trim() ?? '';
    if (trimmed.length > 0) {
        return trimmed;
    }
    return null;
}
