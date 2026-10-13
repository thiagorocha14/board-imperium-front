import { InjectionToken } from '@angular/core';

export const BACKEND_URL = new InjectionToken<string>('BACKEND_URL', {
    factory: () => import.meta.env.NG_APP_BACKEND_URL,
});
