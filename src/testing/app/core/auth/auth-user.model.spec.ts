import { avatarInitials, toAuthUser } from '@core/auth/auth-user.model';

const user = {
    id: 'user-1',
    email: 'ana@example.com',
    displayName: 'Ana Silva',
    avatarUrl: null,
    lastLoginAt: null,
};

describe('auth user', () => {
    it('keeps only the public profile fields', () => {
        expect(toAuthUser({ ...user, accessToken: 'secret' })).toEqual(user);
    });

    it('rejects a payload that is not a user profile', () => {
        expect(toAuthUser(null)).toBeNull();
        expect(toAuthUser({ ...user, avatarUrl: undefined })).toBeNull();
        expect(toAuthUser({ ...user, id: 10 })).toBeNull();
    });

    it('builds initials from the name, then the email', () => {
        expect(avatarInitials(user)).toBe('AS');
        expect(avatarInitials({ ...user, displayName: 'ana' })).toBe('A');
        expect(avatarInitials({ ...user, displayName: '   ' })).toBe('A');
        expect(avatarInitials({ ...user, displayName: '', email: '' })).toBe('?');
    });
});
