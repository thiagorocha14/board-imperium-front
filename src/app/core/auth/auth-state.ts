import { computed, Injectable, signal } from '@angular/core';
import { AuthUser } from './auth-user.model';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

@Injectable({ providedIn: 'root' })
export class AuthState {
  readonly status = signal<AuthStatus>('loading');
  readonly user = signal<AuthUser | null>(null);
  readonly loggedIn = computed(() => this.status() === 'authenticated');

  setAuthenticated(user: AuthUser): void {
    this.user.set(user);
    this.status.set('authenticated');
  }

  setUnauthenticated(): void {
    this.user.set(null);
    this.status.set('unauthenticated');
  }
}
