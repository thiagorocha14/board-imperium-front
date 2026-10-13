import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MultiSelect } from 'primeng/multiselect';
import { RegisterGameForm } from '@features/home/game-form/register-game-form';

interface TaxonomyOption {
    readonly id: number | string;
    readonly name: string;
}

@Component({
    selector: 'app-game-taxonomy-fields',
    imports: [ReactiveFormsModule, MultiSelect],
    templateUrl: './game-taxonomy-fields.html',
    styleUrl: './game-taxonomy-fields.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameTaxonomyFields {
    readonly form = input.required<FormGroup<RegisterGameForm>>();
    readonly categories = input.required<TaxonomyOption[]>();
    readonly mechanics = input.required<TaxonomyOption[]>();
}
