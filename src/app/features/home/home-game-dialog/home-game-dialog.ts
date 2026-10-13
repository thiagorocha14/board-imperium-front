import { ChangeDetectionStrategy, Component, input, output, viewChild } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { BoardGame } from '@core/board-games/board-game.model';
import { GameForm } from '@features/home/game-form/game-form';
import { GameFormSnapshot } from '@features/home/game-form/register-game-form';

export type GameEditor =
    | { readonly kind: 'create' }
    | { readonly kind: 'edit'; readonly phase: 'loading' }
    | { readonly kind: 'edit'; readonly phase: 'error'; readonly message: string }
    | { readonly kind: 'edit'; readonly phase: 'ready'; readonly game: BoardGame };

@Component({
    selector: 'app-home-game-dialog',
    imports: [Dialog, GameForm],
    templateUrl: './home-game-dialog.html',
    styleUrl: './home-game-dialog.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeGameDialog {
    readonly editor = input.required<GameEditor>();
    readonly saving = input(false);
    readonly visibleChange = output<boolean>();
    readonly saveGame = output<GameFormSnapshot>();

    private readonly gameForm = viewChild(GameForm);

    protected header(): string {
        if (this.editor().kind === 'edit') {
            return 'editar jogo';
        }
        return 'adicionar novo jogo';
    }

    protected isCreate(): boolean {
        return this.editor().kind === 'create';
    }

    protected isLoading(): boolean {
        const editor = this.editor();
        return editor.kind === 'edit' && editor.phase === 'loading';
    }

    protected errorMessage(): string | null {
        const editor = this.editor();
        if (editor.kind === 'edit' && editor.phase === 'error') {
            return editor.message;
        }
        return null;
    }

    protected readyGame(): BoardGame | null {
        const editor = this.editor();
        if (editor.kind === 'edit' && editor.phase === 'ready') {
            return editor.game;
        }
        return null;
    }

    showError(lines: readonly string[]): void {
        this.gameForm()?.showError(lines);
    }
}
