export interface AuthUser {
    readonly id: string;
    readonly email: string;
    readonly displayName: string;
    readonly avatarUrl: string | null;
    readonly lastLoginAt: string | null;
}

export function toAuthUser(value: unknown): AuthUser | null {
    if (typeof value !== 'object' || value === null) {
        return null;
    }
    const record = value as Record<string, unknown>;
    if (typeof record['id'] !== 'string' || typeof record['email'] !== 'string') {
        return null;
    }
    if (typeof record['displayName'] !== 'string') {
        return null;
    }
    if (!isNullableString(record['avatarUrl']) || !isNullableString(record['lastLoginAt'])) {
        return null;
    }
    return {
        id: record['id'],
        email: record['email'],
        displayName: record['displayName'],
        avatarUrl: record['avatarUrl'],
        lastLoginAt: record['lastLoginAt'],
    };
}

export function avatarInitials(user: AuthUser): string {
    const source = user.displayName.trim() || user.email.trim();
    const parts = source.split(/\s+/).filter((part) => part.length > 0);
    const first = parts[0]?.[0];
    if (!first) {
        return '?';
    }
    const second = parts[1]?.[0];
    if (second) {
        return `${first}${second}`.toLocaleUpperCase('pt-BR');
    }
    return first.toLocaleUpperCase('pt-BR');
}

export function avatarSource(user: AuthUser): string | null {
    const url = user.avatarUrl?.trim() ?? '';
    if (url.length > 0) {
        return url;
    }
    return null;
}

function isNullableString(value: unknown): value is string | null {
    return value === null || typeof value === 'string';
}
