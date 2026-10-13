import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AccountDialogs {
  readonly loginOpen = signal(false);
  readonly logoutOpen = signal(false);

  openLogin(): void {
    this.logoutOpen.set(false);
    this.loginOpen.set(true);
  }

  closeLogin(): void {
    this.loginOpen.set(false);
  }

  openLogout(): void {
    this.loginOpen.set(false);
    this.logoutOpen.set(true);
  }

  closeLogout(): void {
    this.logoutOpen.set(false);
  }
}
