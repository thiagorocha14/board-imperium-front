import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputNumber } from 'primeng/inputnumber';
import { RegisterGameForm } from '@features/home/game-form/register-game-form';

@Component({
    selector: 'app-game-players-field',
    imports: [ReactiveFormsModule, InputNumber],
    templateUrl: './game-players-field.html',
    styleUrl: './game-players-field.scss',
})
export class GamePlayersField {
    readonly form = input.required<FormGroup<RegisterGameForm>>();
    readonly submitted = input(false);

    protected invalid(name: 'minPlayers' | 'maxPlayers'): boolean {
        if (!this.submitted()) {
            return false;
        }
        if (name === 'maxPlayers' && this.form().hasError('belowMin')) {
            return true;
        }
        return this.form().controls[name].invalid;
    }

    protected minMessage(): string {
        return 'Informe o mínimo de jogadores, com um número inteiro a partir de 1.';
    }

    protected maxMessage(): string {
        if (this.form().hasError('belowMin')) {
            return 'O máximo de jogadores precisa ser maior ou igual ao mínimo.';
        }
        if (this.form().controls.maxPlayers.hasError('integer')) {
            return 'O máximo de jogadores precisa ser um número inteiro a partir de 1.';
        }
        return 'Informe o máximo de jogadores.';
    }
}
