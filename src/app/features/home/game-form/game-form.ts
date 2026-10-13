import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    computed,
    DestroyRef,
    inject,
    input,
    OnInit,
    output,
    signal,
    ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AutoComplete } from 'primeng/autocomplete';
import { DatePicker } from 'primeng/datepicker';
import { Fluid } from 'primeng/fluid';
import { InputNumber } from 'primeng/inputnumber';
import { catchError, of, startWith, Subject, switchMap } from 'rxjs';
import { BoardGame } from '@core/board-games/board-game.model';
import { CatalogService } from '@core/catalog/catalog.service';
import { ludopediaErrorMessage } from '@core/http/api-error';
import { LudopediaGameDetail, LudopediaGameSummary } from '@core/ludopedia/ludopedia.model';
import { LudopediaService } from '@core/ludopedia/ludopedia.service';
import { GameLevelField } from '@features/home/game-form/game-level-field/game-level-field';
import { GamePlayersField } from '@features/home/game-form/game-players-field/game-players-field';
import { GameTaxonomyFields } from '@features/home/game-form/game-taxonomy-fields/game-taxonomy-fields';
import {
    createRegisterGameForm,
    emptyRegisterGameForm,
    formPatchFromLudopediaDetail,
    formValueFromBoardGame,
    GameFormSnapshot,
    imageUrlIssue,
    RegisterGameForm,
} from '@features/home/game-form/register-game-form';

interface Notice {
    tone: 'error' | 'ok';
    lines: readonly string[];
}

interface TaxonomyOption {
    readonly id: number | string;
    readonly name: string;
}

type FieldName = keyof RegisterGameForm;
type GameFormMode = 'create' | 'edit';

@Component({
    selector: 'app-game-form',
    imports: [
        ReactiveFormsModule,
        AutoComplete,
        DatePicker,
        Fluid,
        InputNumber,
        GameLevelField,
        GamePlayersField,
        GameTaxonomyFields,
    ],
    templateUrl: './game-form.html',
    styleUrl: './game-form.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'register-game-page' },
})
export class GameForm implements OnInit {
    private readonly ludopedia = inject(LudopediaService);
    private readonly catalog = inject(CatalogService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly changeDetector = inject(ChangeDetectorRef);
    private readonly searches = new Subject<string>();
    private readonly selections = new Subject<number>();
    private linkedName: string | null = null;
    private applying = false;

    readonly mode = input<GameFormMode>('create');
    readonly saving = input(false);
    readonly sourceGame = input<BoardGame | null>(null);
    readonly saveGame = output<GameFormSnapshot>();

    protected readonly form: FormGroup<RegisterGameForm> = createRegisterGameForm();
    protected readonly maxPurchaseDate = endOfToday();
    protected readonly suggestions = signal<LudopediaGameSummary[]>([]);
    protected readonly categories = signal<TaxonomyOption[]>([]);
    protected readonly mechanics = signal<TaxonomyOption[]>([]);
    protected readonly notice = signal<Notice | null>(null);
    protected readonly submitted = signal(false);

    private readonly imageUrlValue = toSignal(
        this.form.controls.imageUrl.valueChanges.pipe(startWith(this.form.controls.imageUrl.value)),
        { initialValue: this.form.controls.imageUrl.value },
    );

    protected readonly imagePreview = computed(() => {
        const value = this.imageUrlValue().trim();
        if (value.length > 0 && imageUrlIssue(value) == null) {
            return value;
        }
        return null;
    });

    constructor() {
        this.searches
            .pipe(
                switchMap((query) => {
                    const term = query.trim();
                    if (term.length < 2) {
                        return of<LudopediaGameSummary[]>([]);
                    }
                    return this.ludopedia.searchGames(term).pipe(
                        catchError((error: unknown) => {
                            this.notice.set({
                                tone: 'error',
                                lines: [ludopediaErrorMessage(error, 'search')],
                            });
                            return of<LudopediaGameSummary[]>([]);
                        }),
                    );
                }),
                takeUntilDestroyed(),
            )
            .subscribe((games) => {
                this.suggestions.set(games);
                this.changeDetector.markForCheck();
            });

        this.selections
            .pipe(
                switchMap((id) =>
                    this.ludopedia.getGame(id).pipe(
                        catchError((error: unknown) => {
                            this.notice.set({
                                tone: 'error',
                                lines: [ludopediaErrorMessage(error, 'detail')],
                            });
                            this.changeDetector.markForCheck();
                            return of(null);
                        }),
                    ),
                ),
                takeUntilDestroyed(),
            )
            .subscribe((detail) => {
                if (detail) {
                    this.applyDetail(detail);
                }
            });

        this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
            if (this.applying) {
                return;
            }
            if (this.notice()?.tone === 'ok') {
                this.notice.set(null);
            }
            const name = this.form.controls.name.value;
            if (typeof name === 'string' && name.trim().length < 2) {
                this.suggestions.set([]);
            }
            if (
                this.linkedName !== null &&
                (typeof name !== 'string' || name.trim() !== this.linkedName)
            ) {
                this.linkedName = null;
                this.form.controls.imageUrl.setValue('');
            }
            this.changeDetector.markForCheck();
        });
    }

    ngOnInit(): void {
        const game = this.sourceGame();
        if (game) {
            this.applyBoardGame(game);
        }
        this.loadTaxonomy();
    }

    showError(lines: readonly string[]): void {
        this.notice.set({ tone: 'error', lines });
        this.changeDetector.markForCheck();
    }

    resetAfterCreate(): void {
        this.form.reset(emptyRegisterGameForm());
        this.suggestions.set([]);
        this.linkedName = null;
        this.submitted.set(false);
        this.notice.set({ tone: 'ok', lines: ['Jogo salvo.'] });
        this.changeDetector.markForCheck();
    }

    replaceWithSaved(game: BoardGame): void {
        this.applyBoardGame(game);
        this.submitted.set(false);
        this.notice.set({ tone: 'ok', lines: ['Jogo salvo.'] });
        this.changeDetector.markForCheck();
    }

    protected noticeRole(tone: Notice['tone']): 'alert' | 'status' {
        if (tone === 'error') {
            return 'alert';
        }
        return 'status';
    }

    protected onComplete(event: { query: string }): void {
        this.searches.next(event.query);
    }

    protected onGameSelected(event: { value: unknown }): void {
        const game = asSummary(event.value);
        if (!game) {
            return;
        }
        this.linkedName = null;
        this.form.controls.name.setValue(game.name);
        this.linkedName = game.name.trim();
        this.form.controls.imageUrl.setValue(game.imageUrl?.trim() ?? '');
        this.selections.next(game.id);
    }

    protected invalid(name: FieldName): boolean {
        if (!this.submitted()) {
            return false;
        }
        const control = this.form.controls[name];
        if (name === 'maxPlayers' && this.form.hasError('belowMin')) {
            return true;
        }
        return control.invalid;
    }

    protected messageFor(name: FieldName): string {
        switch (name) {
            case 'name':
                if (this.form.controls.name.hasError('maxlength')) {
                    return 'O nome pode ter no máximo 150 caracteres.';
                }
                return 'Informe o nome do jogo.';
            case 'complexity':
                return 'A complexidade precisa ser um número de 1 a 5, com até 2 casas decimais.';
            case 'level':
                return 'Escolha o nosso nível, de 1 a 5.';
            case 'playTimeMinutes':
                return 'Informe o tempo de partida em minutos, com um número inteiro a partir de 1.';
            case 'minPlayers':
                return 'Informe o mínimo de jogadores, com um número inteiro a partir de 1.';
            case 'maxPlayers':
                if (this.form.hasError('belowMin')) {
                    return 'O máximo de jogadores precisa ser maior ou igual ao mínimo.';
                }
                if (this.form.controls.maxPlayers.hasError('integer')) {
                    return 'O máximo de jogadores precisa ser um número inteiro a partir de 1.';
                }
                return 'Informe o máximo de jogadores.';
            case 'purchasedAt':
                return 'A data de compra não pode ser no futuro.';
            case 'imageUrl':
                return imageMessage(this.form.controls.imageUrl.value);
            default:
                return '';
        }
    }

    protected save(): void {
        if (this.saving()) {
            return;
        }
        this.submitted.set(true);
        this.form.markAllAsTouched();
        if (this.form.invalid) {
            this.changeDetector.markForCheck();
            return;
        }
        this.notice.set(null);
        this.saveGame.emit(this.form.getRawValue());
    }

    private applyBoardGame(game: BoardGame): void {
        this.applying = true;
        this.form.setValue(formValueFromBoardGame(game));
        this.applying = false;
    }

    private applyDetail(detail: LudopediaGameDetail): void {
        const patch = formPatchFromLudopediaDetail(detail);
        this.linkedName = patch.name.trim();
        // Ludopedia taxonomy ids are integers and must not replace catalog UUIDs.
        if (this.mode() === 'edit') {
            this.form.patchValue({
                name: patch.name,
                complexity: patch.complexity,
                playTimeMinutes: patch.playTimeMinutes,
                minPlayers: patch.minPlayers,
                maxPlayers: patch.maxPlayers,
                imageUrl: patch.imageUrl,
            });
        } else {
            this.form.patchValue(patch);
        }
        this.changeDetector.markForCheck();
    }

    private loadTaxonomy(): void {
        if (this.mode() === 'edit') {
            this.catalog
                .listCategories()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (items) => {
                        this.categories.set(items);
                        this.changeDetector.markForCheck();
                    },
                    error: (error: unknown) => this.failTaxonomy(error, 'categories'),
                });
            this.catalog
                .listMechanics()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (items) => {
                        this.mechanics.set(items);
                        this.changeDetector.markForCheck();
                    },
                    error: (error: unknown) => this.failTaxonomy(error, 'mechanics'),
                });
            return;
        }

        this.ludopedia
            .listCategories()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (items) => {
                    this.categories.set(items);
                    this.changeDetector.markForCheck();
                },
                error: (error: unknown) => this.failTaxonomy(error, 'categories'),
            });
        this.ludopedia
            .listMechanics()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (items) => {
                    this.mechanics.set(items);
                    this.changeDetector.markForCheck();
                },
                error: (error: unknown) => this.failTaxonomy(error, 'mechanics'),
            });
    }

    private catalogFailureLine(error: unknown): string {
        if (this.mode() === 'edit') {
            return 'Não foi possível carregar as categorias e mecânicas.';
        }
        return ludopediaErrorMessage(error, 'catalog');
    }

    private failTaxonomy(error: unknown, kind: 'categories' | 'mechanics'): void {
        if (kind === 'mechanics') {
            this.mechanics.set([]);
        } else {
            this.categories.set([]);
        }
        const line = this.catalogFailureLine(error);
        this.notice.set({ tone: 'error', lines: [line] });
        this.changeDetector.markForCheck();
    }
}

function endOfToday(): Date {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
}

function imageMessage(value: string): string {
    const issue = imageUrlIssue(value);
    if (issue === 'credentials') {
        return 'A URL da imagem não pode ter usuário ou senha.';
    }
    if (issue === 'length') {
        return 'A URL da imagem pode ter no máximo 2048 caracteres.';
    }
    return 'A imagem precisa ser uma URL http ou https.';
}

function asSummary(value: unknown): LudopediaGameSummary | null {
    if (typeof value !== 'object' || value === null) {
        return null;
    }
    const record = value as Record<string, unknown>;
    if (typeof record['id'] !== 'number' || typeof record['name'] !== 'string') {
        return null;
    }
    return value as LudopediaGameSummary;
}
