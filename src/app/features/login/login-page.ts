import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AccountDialogs } from '@core/auth/account-dialogs';

@Component({
    selector: 'app-login-page',
    templateUrl: './login-page.html',
    styleUrl: './login-page.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
    private readonly dialogs = inject(AccountDialogs);

    constructor() {
        this.dialogs.openLogin();
    }
}
