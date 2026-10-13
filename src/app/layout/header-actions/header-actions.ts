import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountDialogs } from '../../core/auth/account-dialogs';
import { AuthState } from '../../core/auth/auth-state';
import { AuthUser, avatarSource } from '../../core/auth/auth-user.model';
import { LOGIN_PATH } from '../../core/navigation/app-screens';

interface HeaderAction {
  readonly id: 'login' | 'logout';
  readonly tone: 'blue' | 'red';
  readonly icon: string;
  readonly label: string;
  readonly disabled: boolean;
}

@Component({
  selector: 'app-header-actions',
  templateUrl: './header-actions.html',
  styleUrl: './header-actions.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderActions {
  private readonly auth = inject(AuthState);
  private readonly dialogs = inject(AccountDialogs);
  private readonly router = inject(Router);

  protected readonly status = this.auth.status;
  protected readonly user = this.auth.user;
  protected readonly brokenAvatarUrl = signal<string | null>(null);
  protected readonly actions = computed<readonly HeaderAction[]>(() => {
    const loggedIn = this.auth.loggedIn();
    const logout: HeaderAction = {
      id: 'logout',
      tone: 'red',
      icon: 'pi pi-sign-out',
      label: 'Sair',
      disabled: !loggedIn,
    };
    if (loggedIn) return [logout];
    return [
      {
        id: 'login',
        tone: 'blue',
        icon: 'pi pi-sign-in',
        label: 'Entrar',
        disabled: false,
      },
      logout,
    ];
  });

  protected avatarUrl(user: AuthUser): string | null {
    const url = avatarSource(user);
    return url !== null && this.brokenAvatarUrl() !== url ? url : null;
  }

  protected onAvatarError(url: string): void {
    this.brokenAvatarUrl.set(url);
  }

  protected onAction(action: HeaderAction): void {
    if (action.disabled) return;
    if (action.id === 'login') {
      this.dialogs.openLogin();
      void this.router.navigate(['/', LOGIN_PATH]);
      return;
    }
    if (action.id === 'logout') this.dialogs.openLogout();
  }
}
