import { BoardGame } from '@core/board-games/board-game.model';

export type CriterionMode = 'level' | 'category' | 'mechanic';
export type LoadState = 'loading' | 'ready' | 'error';
export type ReelPhase = 'idle' | 'spinning' | 'result' | 'error';

export interface Criterion {
    readonly mode: CriterionMode;
    readonly level: number;
    readonly categoryId: string | null;
    readonly mechanicId: string | null;
}

export interface SpinCover {
    readonly key: string;
    readonly imageUrl: string | null;
}

export interface ReelState {
    readonly id: number;
    readonly criterion: Criterion;
    readonly phase: ReelPhase;
    readonly game: BoardGame | null;
    readonly message: string | null;
    readonly broken: boolean;
    readonly spinCovers: readonly SpinCover[];
}

export interface RouletteColumnView {
    readonly reel: ReelState;
    readonly label: string;
    readonly number: number;
    readonly duration: string;
    readonly delay: string;
    readonly expanded: boolean;
}
