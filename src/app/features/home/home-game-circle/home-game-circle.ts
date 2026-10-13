import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface HomeCircleView {
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

@Component({
    selector: 'app-home-game-circle',
    templateUrl: './home-game-circle.html',
    styleUrl: './home-game-circle.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeGameCircle {
    readonly kind = input<'game' | 'add'>('game');
    readonly item = input<HomeCircleView | null>(null);
    readonly broken = input(false);
    readonly reverseSpin = input(false);
    readonly openGame = output<string>();
    readonly addGame = output<void>();
    readonly coverError = output<number>();

    protected open(): void {
        const item = this.item();
        if (item == null) {
            return;
        }
        this.openGame.emit(item.id);
    }

    protected failCover(): void {
        const item = this.item();
        if (item == null) {
            return;
        }
        this.coverError.emit(item.index);
    }
}
