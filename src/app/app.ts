import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppShell } from '@layout/app-shell/app-shell';

@Component({
    selector: 'app-root',
    imports: [AppShell],
    template: '<app-shell />',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
