export function backendPath(backendUrl: string, path: string): string {
    const base = backendUrl.replace(/\/+$/, '');
    let suffix = path;
    if (!path.startsWith('/')) {
        suffix = `/${path}`;
    }
    return `${base}${suffix}`;
}
