import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { APP_SCREENS } from '../../core/navigation/app-screens';

/*
 * PrimeNG Tabs render buttons with aria-selected and an internal ink bar.
 * Folder tabs that merge into the panel and aria-current="page" on real
 * links need a dedicated nav instead.
 */
@Component({
  selector: 'app-folder-tabs',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './folder-tabs.html',
  styleUrl: './folder-tabs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FolderTabs {
  protected readonly screens = APP_SCREENS;
}

