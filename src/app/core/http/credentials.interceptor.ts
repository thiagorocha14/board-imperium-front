import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BACKEND_URL } from '../config/backend-url';

export function isBackendRequest(url: string, backendUrl: string): boolean {
  const base = backendUrl.replace(/\/+$/, '');
  return url === base || url.startsWith(`${base}/`);
}

export const credentialsInterceptor: HttpInterceptorFn = (request, next) => {
  const backendUrl = inject(BACKEND_URL);
  if (!isBackendRequest(request.url, backendUrl)) {
    return next(request);
  }
  return next(request.clone({ withCredentials: true }));
};
