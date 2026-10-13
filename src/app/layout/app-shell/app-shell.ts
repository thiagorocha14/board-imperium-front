import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeader } from '../app-header/app-header';
import { AccountDialogs } from '../account-dialogs/account-dialogs';
import { FolderTabs } from '../folder-tabs/folder-tabs';

@Component({
  selector: 'app-shell',
  imports: [AppHeader, FolderTabs, RouterOutlet, AccountDialogs],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShell {}
