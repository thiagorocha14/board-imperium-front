import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { LOGIN_PATH } from '@core/navigation/app-screens';
import { AuthState, AuthStatus } from '@core/auth/auth-state';

export const requireAuth: CanActivateFn = () => {
    const router = inject(Router);
    return whenAuthResolved().pipe(
        map((status) => status === 'authenticated' || router.createUrlTree(['/', LOGIN_PATH])),
    );
};

export const requireGuest: CanActivateFn = () => {
    const router = inject(Router);
    return whenAuthResolved().pipe(
        map((status) => status === 'unauthenticated' || router.createUrlTree(['/'])),
    );
};

function whenAuthResolved() {
    return toObservable(inject(AuthState).status).pipe(
        filter((status): status is Exclude<AuthStatus, 'loading'> => status !== 'loading'),
        take(1),
    );
}
