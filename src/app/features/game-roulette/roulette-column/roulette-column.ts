import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BoardGame } from '@core/board-games/board-game.model';
import { ReelState } from '@features/game-roulette/roulette.model';

@Component({
    selector: 'app-roulette-column',
    templateUrl: './roulette-column.html',
    styleUrl: './roulette-column.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouletteColumn {
    readonly reel = input.required<ReelState>();
    readonly label = input.required<string>();
    readonly columnNumber = input.required<number>();
    readonly duration = input.required<string>();
    readonly delay = input.required<string>();
    readonly expanded = input(false);
    readonly drawing = input(false);
    readonly reducedMotion = input(false);
    readonly canRemove = input(false);
    readonly openCriterion = output<number>();
    readonly redraw = output<number>();
    readonly remove = output<number>();
    readonly coverFailed = output<number>();

    protected coverOf(game: BoardGame): string | null {
        return coverUrl(game.imageUrl);
    }

    protected initialOf(name: string): string {
        const trimmed = name.trim();
        return Array.from(trimmed)[0] ?? '•';
    }
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
