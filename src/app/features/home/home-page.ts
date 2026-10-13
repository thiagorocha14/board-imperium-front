import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { Toast } from 'primeng/toast';
import { catchError, of } from 'rxjs';
import { BoardGame, BoardGameCollectionItem } from '../../core/board-games/board-game.model';
import { BoardGameService } from '../../core/board-games/board-game.service';
import { readApiError, saveErrorMessage } from '../../core/http/api-error';
import { GameForm } from '../register-games/game-form';
import {
  asEditGameFormValue,
  GameFormSnapshot,
  toCreateBoardGameRequest,
  toUpdateBoardGameRequest,
} from '../register-games/register-game-form';
import { COLLECTION_SEED, placeCollection } from './collection-layout';

interface CircleView {
  readonly index: number;
  readonly id: string;
  readonly name: string;
  readonly purchased: string;
  readonly initial: string;
  readonly imageUrl: string | null;
  readonly x: string;
  readonly y: string;
  readonly pileX: string;
  readonly pileY: string;
  readonly spin: string;
  readonly delay: string;
}

type ShufflePhase = 'idle' | 'gathering' | 'spreading';

interface CircleLayout {
  readonly spanX: string;
  readonly spanY: string;
  readonly items: readonly CircleView[];
}

type CollectionState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly games: readonly BoardGameCollectionItem[] };

type GameEditor =
  | { readonly kind: 'create' }
  | { readonly kind: 'edit'; readonly phase: 'loading' }
  | { readonly kind: 'edit'; readonly phase: 'error'; readonly message: string }
  | { readonly kind: 'edit'; readonly phase: 'ready'; readonly game: BoardGame };

const EMPTY_LAYOUT: CircleLayout = { spanX: '1.0400', spanY: '1.0400', items: [] };
const SAVED_TOAST = 'jogo salvo com sucesso';
const GATHER_MS = 920;
const SPREAD_MS = 760;

@Component({
  selector: 'app-home-page',
  imports: [Dialog, GameForm, Toast],
  providers: [MessageService],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly boardGames = inject(BoardGameService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly nextSeed = inject(COLLECTION_SEED);
  private readonly messages = inject(MessageService);
  private readonly gameForm = viewChild(GameForm);

  protected readonly title = inject(ActivatedRoute).snapshot.title ?? '';
  protected readonly levels = [1, 2, 3, 4, 5] as const;
  protected readonly refreshing = signal(false);
  protected readonly saving = signal(false);
  private readonly state = signal<CollectionState>({ status: 'loading' });
  private readonly seed = signal(this.nextSeed());
  private readonly selectedLevels = signal<ReadonlySet<number>>(new Set());
  private readonly narrow = signal(false);
  private readonly broken = signal<ReadonlySet<number>>(new Set());
  private readonly editorState = signal<GameEditor | null>(null);
  protected readonly shuffle = signal<ShufflePhase>('idle');
  private editorGeneration = 0;
  private shuffleTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly collectionEmpty = computed(() => {
    const state = this.state();
    return state.status === 'ready' && state.games.length === 0;
  });

  protected readonly hasGames = computed(() => {
    const state = this.state();
    return state.status === 'ready' && state.games.length > 0;
  });

  protected readonly editor = this.editorState.asReadonly();

  protected readonly circles = computed(() => {
    const state = this.state();
    if (state.status !== 'ready') return EMPTY_LAYOUT;
    const selected = this.selectedLevels();
    const visible = state.games
      .map((game, index) => ({ game, index }))
      .filter(({ game }) => selected.size === 0 || selected.has(game.level));
    const layout = placeCollection(
      visible.map(({ game }) => game.name),
      this.narrow() ? 'narrow' : 'wide',
      this.seed(),
    );
    return {
      spanX: layout.spanX,
      spanY: layout.spanY,
      items: visible.map(({ game, index }, position) => ({
        index,
        id: game.id,
        name: game.name,
        purchased: formatPurchasedAt(game.purchasedAt),
        initial: initialOf(game.name),
        imageUrl: coverUrl(game.imageUrl),
        x: layout.items[position]?.x ?? '0.0000',
        y: layout.items[position]?.y ?? '0.0000',
        pileX: ((wobble(index, 1) - 0.5) * 0.3).toFixed(4),
        pileY: ((wobble(index, 2) - 0.5) * 0.3).toFixed(4),
        spin: `${Math.round((wobble(index, 3) - 0.5) * 50)}deg`,
        delay: `${Math.round(wobble(index, 4) * 90)}ms`,
      })),
    };
  });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterRenderEffect(() => {
      if (this.circles().items.length === 0) return;
      const center = host.querySelector<HTMLElement>('.circle.is-center');
      const panel = host.querySelector<HTMLElement>('.stage');
      if (!center || !panel) return;
      const circle = center.getBoundingClientRect();
      const frame = panel.getBoundingClientRect();
      panel.scrollTop += circle.top + circle.height / 2 - (frame.top + panel.clientHeight / 2);
    });
    this.watchViewport();
    this.destroyRef.onDestroy(() => this.stopShuffle());
    this.boardGames
      .listCollection()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (games) => {
          this.state.set({ status: 'ready', games });
          if (games.length > 0) this.playShuffle();
        },
        error: () => this.state.set({ status: 'error' }),
      });
  }

  protected loading(): boolean {
    return this.state().status === 'loading';
  }

  protected failed(): boolean {
    return this.state().status === 'error';
  }

  protected levelSelected(level: number): boolean {
    return this.selectedLevels().has(level);
  }

  protected toggleLevel(level: number): void {
    this.selectedLevels.update((current) => {
      const next = new Set(current);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  protected reload(): void {
    if (this.refreshing() || this.loading()) return;
    this.refreshing.set(true);
    this.boardGames
      .listCollection()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (games) => {
          this.broken.set(new Set());
          this.state.set({ status: 'ready', games });
          this.refreshing.set(false);
        },
        error: () => {
          this.state.set({ status: 'error' });
          this.refreshing.set(false);
        },
      });
  }

  protected reorder(): void {
    if (!this.hasGames() || this.shuffle() !== 'idle') return;
    this.seed.set(this.nextSeed());
    this.playShuffle();
  }

  private playShuffle(): void {
    if (prefersReducedMotion()) return;
    if (this.shuffleTimer !== null) clearTimeout(this.shuffleTimer);
    this.shuffle.set('gathering');
    this.shuffleTimer = setTimeout(() => {
      this.shuffle.set('spreading');
      this.shuffleTimer = setTimeout(() => this.stopShuffle(), SPREAD_MS);
    }, GATHER_MS);
  }

  private stopShuffle(): void {
    if (this.shuffleTimer !== null) clearTimeout(this.shuffleTimer);
    this.shuffleTimer = null;
    this.shuffle.set('idle');
  }

  protected openCreate(): void {
    this.editorGeneration += 1;
    this.saving.set(false);
    this.editorState.set({ kind: 'create' });
  }

  protected openEdit(id: string): void {
    const generation = ++this.editorGeneration;
    this.saving.set(false);
    this.editorState.set({ kind: 'edit', phase: 'loading' });
    this.boardGames
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (game) => {
          if (generation !== this.editorGeneration) return;
          this.editorState.set({ kind: 'edit', phase: 'ready', game });
        },
        error: (error: unknown) => {
          if (generation !== this.editorGeneration) return;
          this.editorState.set({
            kind: 'edit',
            phase: 'error',
            message: loadErrorMessage(error),
          });
        },
      });
  }

  protected onEditorVisible(open: boolean): void {
    if (!open) this.closeEditor();
  }

  protected save(value: GameFormSnapshot): void {
    const editor = this.editorState();
    if (editor == null || this.saving()) return;
    const generation = this.editorGeneration;
    const request =
      editor.kind === 'create'
        ? this.boardGames.create(toCreateBoardGameRequest(value))
        : editor.phase === 'ready'
          ? this.boardGames.update(
              editor.game.id,
              toUpdateBoardGameRequest(asEditGameFormValue(value)),
            )
          : null;
    if (request == null) return;
    this.saving.set(true);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error: unknown) => {
          if (generation === this.editorGeneration) {
            const message =
              editor.kind === 'edit' ? editSaveErrorMessage(error) : saveErrorMessage(error);
            this.gameForm()?.showError(message.split('\n'));
          }
          return of(null);
        }),
      )
      .subscribe((game) => {
        if (generation !== this.editorGeneration) return;
        this.saving.set(false);
        if (game == null) return;
        this.rememberGame(game);
        this.closeEditor();
        this.messages.add({
          detail: SAVED_TOAST,
          life: 4500,
          closable: false,
          styleClass: 'retro-toast',
        });
      });
  }

  protected coverFailed(index: number): boolean {
    return this.broken().has(index);
  }

  protected markBroken(index: number): void {
    this.broken.update((current) => {
      if (current.has(index)) return current;
      const next = new Set(current);
      next.add(index);
      return next;
    });
  }

  private closeEditor(): void {
    this.editorGeneration += 1;
    this.saving.set(false);
    this.editorState.set(null);
  }

  private rememberGame(game: BoardGame): void {
    const item: BoardGameCollectionItem = {
      id: game.id,
      name: game.name,
      level: game.level,
      purchasedAt: game.purchasedAt,
      imageUrl: game.imageUrl,
    };
    this.state.update((current) => {
      const games = current.status === 'ready' ? [...current.games] : [];
      const index = games.findIndex((existing) => existing.id === item.id);
      if (index < 0) games.push(item);
      else games[index] = item;
      return { status: 'ready', games };
    });
  }

  private watchViewport(): void {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia('(max-width: 720px)');
    this.narrow.set(query.matches);
    const onChange = (event: MediaQueryListEvent): void => {
      this.narrow.set(event.matches);
    };
    query.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
  }
}

function formatPurchasedAt(value: string | null): string {
  if (value == null) return 'sem data de compra';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return 'sem data de compra';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function wobble(index: number, salt: number): number {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== 'function') return false;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function initialOf(name: string): string {
  const trimmed = name.trim();
  return Array.from(trimmed)[0] ?? '•';
}

function coverUrl(value: string | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function loadErrorMessage(error: unknown): string {
  const body = readApiError(error);
  if (body?.statusCode === 404) return 'Esse jogo não foi encontrado.';
  return 'Não foi possível carregar o jogo.';
}

function editSaveErrorMessage(error: unknown): string {
  const body = readApiError(error);
  if (body?.statusCode !== 404) return saveErrorMessage(error);
  if (body.message === 'Category not found') return 'Uma das categorias não foi encontrada.';
  if (body.message === 'Mechanic not found') return 'Uma das mecânicas não foi encontrada.';
  if (body.message === 'Board game not found') return 'Esse jogo não foi encontrado.';
  return 'Não foi possível salvar o jogo.';
}
