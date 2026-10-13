import { HttpErrorResponse } from '@angular/common/http';
import {
    LUDOPEDIA_UNAVAILABLE_MESSAGE,
    ludopediaErrorMessage,
    saveErrorMessage,
    SESSION_EXPIRED_MESSAGE,
} from '@core/http/api-error';

describe('api error messages', () => {
    it('shows validation details, then the message', () => {
        expect(
            saveErrorMessage(
                apiError(400, 'ValidationError', 'Invalid request', ['name is required']),
            ),
        ).toBe('name is required');
        expect(saveErrorMessage(apiError(400, 'ValidationError', 'Invalid request'))).toBe(
            'Invalid request',
        );
    });

    it('explains an invalid session and a duplicated name', () => {
        expect(saveErrorMessage(apiError(401, 'UnauthorizedError', 'Authentication failed'))).toBe(
            SESSION_EXPIRED_MESSAGE,
        );
        expect(
            saveErrorMessage(apiError(409, 'ConflictError', 'Board game name already exists')),
        ).toBe('Já existe um jogo com esse nome.');
    });

    it('uses the Ludopedia message only for provider outages', () => {
        const outage = apiError(502, 'ProviderUnavailableError', 'Catalog provider is unavailable');
        expect(ludopediaErrorMessage(outage, 'catalog')).toBe(LUDOPEDIA_UNAVAILABLE_MESSAGE);
        expect(ludopediaErrorMessage(outage, 'search')).toBe(LUDOPEDIA_UNAVAILABLE_MESSAGE);
        expect(
            saveErrorMessage(apiError(401, 'UnauthorizedError', 'Authentication failed')),
        ).not.toBe(LUDOPEDIA_UNAVAILABLE_MESSAGE);
    });

    it('keeps manual entry available when a Ludopedia game is missing', () => {
        expect(
            ludopediaErrorMessage(apiError(404, 'NotFoundError', 'missing'), 'detail'),
        ).toContain('não foi encontrado');
    });
});

function apiError(
    status: number,
    error: string,
    message: string,
    details?: readonly string[],
): HttpErrorResponse {
    const payload: {
        statusCode: number;
        error: string;
        message: string;
        details?: readonly string[];
    } = { statusCode: status, error, message };
    if (details) {
        payload.details = details;
    }
    return new HttpErrorResponse({
        status,
        error: payload,
    });
}
