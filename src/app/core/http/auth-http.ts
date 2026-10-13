import { HttpContext, HttpContextToken } from '@angular/common/http';

/** The session check handles its own refresh, so the interceptor must not repeat it. */
export const SKIP_AUTH_REFRESH = new HttpContextToken<boolean>(() => false);

/** A request already repeated after one refresh must not start another. */
export const AUTH_RETRY = new HttpContextToken<boolean>(() => false);

/** A 401 from these routes is not an expired session. */
const REFRESH_EXEMPT_PATHS = new Set([
  '/auth/refresh',
  '/auth/logout',
  '/auth/google/login',
  '/auth/login',
  '/auth/register',
]);

export function skipAuthRefresh(): HttpContext {
  return new HttpContext().set(SKIP_AUTH_REFRESH, true);
}

export function isAuthRefreshExempt(url: string): boolean {
  try {
    return REFRESH_EXEMPT_PATHS.has(new URL(url).pathname);
  } catch {
    return false;
  }
}
