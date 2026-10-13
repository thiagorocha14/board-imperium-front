import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
    selector: 'app-home-corner-actions',
    templateUrl: './home-corner-actions.html',
    styleUrl: './home-corner-actions.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeCornerActions {
    readonly shuffling = input(false);
    readonly reorder = output<void>();
    readonly add = output<void>();
}
