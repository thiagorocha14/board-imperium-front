import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
    selector: 'app-home-level-filter',
    templateUrl: './home-level-filter.html',
    styleUrl: './home-level-filter.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeLevelFilter {
    readonly levels = input.required<readonly number[]>();
    readonly selectedLevels = input.required<ReadonlySet<number>>();
    readonly refreshing = input(false);
    readonly loading = input(false);
    readonly levelToggled = output<number>();
    readonly reloadCollection = output<void>();

    protected levelSelected(level: number): boolean {
        return this.selectedLevels().has(level);
    }

    protected reloadDisabled(): boolean {
        return this.refreshing() || this.loading();
    }
}
