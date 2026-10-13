import { Component, input } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
    selector: 'app-game-level-field',
    templateUrl: './game-level-field.html',
    styleUrl: './game-level-field.scss',
})
export class GameLevelField {
    readonly control = input.required<FormControl<number | null>>();
    readonly submitted = input(false);

    protected invalid(): boolean {
        if (!this.submitted()) {
            return false;
        }
        return this.control().invalid;
    }

    protected levelText(): string {
        const level = this.control().value;
        if (level == null) {
            return '—';
        }
        return String(level);
    }

    protected levelFill(): string {
        const level = this.control().value;
        if (level == null) {
            return '0%';
        }
        return `${((level - 1) / 4) * 100}%`;
    }

    protected ariaValueText(): string {
        if (this.control().value === null) {
            return 'sem valor';
        }
        return this.levelText();
    }

    protected sliderValue(): number {
        return this.control().value ?? 3;
    }

    protected commitLevel(event: Event): void {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) {
            return;
        }
        this.setLevel(Number(input.value));
    }

    protected commitLevelFromKey(event: KeyboardEvent): void {
        if (
            !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)
        ) {
            return;
        }
        this.commitLevel(event);
    }

    protected onLevelKeydown(event: KeyboardEvent): void {
        if (this.control().value !== null) {
            return;
        }
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowDown' && event.key !== 'Home') {
            return;
        }
        this.setLevel(3);
        event.preventDefault();
    }

    private setLevel(value: number): void {
        if (!Number.isInteger(value) || value < 1 || value > 5) {
            return;
        }
        this.control().setValue(value);
        this.control().markAsDirty();
    }
}
