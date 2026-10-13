import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouletteColumnView } from '@features/game-roulette/roulette.model';
import { RouletteColumn } from '@features/game-roulette/roulette-column/roulette-column';

@Component({
    selector: 'app-roulette-machine',
    imports: [RouletteColumn],
    templateUrl: './roulette-machine.html',
    styleUrl: './roulette-machine.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouletteMachine {
    readonly columns = input.required<readonly RouletteColumnView[]>();
    readonly drawing = input(false);
    readonly leverDown = input(false);
    readonly reducedMotion = input(false);
    readonly canAdd = input(false);
    readonly canRemove = input(false);
    readonly addColumn = output<void>();
    readonly pullLever = output<void>();
    readonly openCriterion = output<number>();
    readonly redrawColumn = output<number>();
    readonly removeColumn = output<number>();
    readonly markBroken = output<number>();
}
