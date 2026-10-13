export function backendPath(backendUrl: string, path: string): string {
  const base = backendUrl.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}
