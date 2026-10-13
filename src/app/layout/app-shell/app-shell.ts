import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeader } from '@layout/app-header/app-header';
import { AccountDialogs } from '@layout/account-dialogs/account-dialogs';
import { FolderTabs } from '@layout/folder-tabs/folder-tabs';

@Component({
    selector: 'app-shell',
    imports: [AppHeader, FolderTabs, RouterOutlet, AccountDialogs],
    templateUrl: './app-shell.html',
    styleUrl: './app-shell.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {}
