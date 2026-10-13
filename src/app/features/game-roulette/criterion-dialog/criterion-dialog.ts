import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { CatalogEntry } from '@core/catalog/catalog.model';
import { Criterion, CriterionMode, LoadState } from '@features/game-roulette/roulette.model';

@Component({
    selector: 'app-criterion-dialog',
    imports: [Dialog],
    templateUrl: './criterion-dialog.html',
    styleUrl: './criterion-dialog.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CriterionDialog {
    readonly header = input.required<string>();
    readonly open = input(false);
    readonly draft = input.required<Criterion>();
    readonly levels = input.required<readonly number[]>();
    readonly categories = input.required<readonly CatalogEntry[]>();
    readonly mechanics = input.required<readonly CatalogEntry[]>();
    readonly categoriesState = input.required<LoadState>();
    readonly mechanicsState = input.required<LoadState>();
    readonly ready = input(false);
    readonly visibleChange = output<boolean>();
    readonly modeChange = output<CriterionMode>();
    readonly levelChange = output<Event>();
    readonly categoryChange = output<Event>();
    readonly mechanicChange = output<Event>();
    readonly dismiss = output<void>();
    readonly confirm = output<void>();
}
