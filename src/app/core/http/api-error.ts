import { HttpErrorResponse } from '@angular/common/http';

export const LUDOPEDIA_UNAVAILABLE_MESSAGE = 'Não foi possível consultar a Ludopedia agora';
export const SESSION_EXPIRED_MESSAGE = 'Sessão inválida. É preciso entrar de novo.';

export interface ApiErrorBody {
    statusCode: number;
    error: string;
    message: string;
    details?: readonly string[];
}

export type LudopediaSource = 'catalog' | 'search' | 'detail';

export function readApiError(error: unknown): ApiErrorBody | null {
    if (!(error instanceof HttpErrorResponse)) {
        return null;
    }
    return (
        parseApiErrorBody(error.error) ?? {
            statusCode: error.status,
            error: '',
            message: error.message,
        }
    );
}

export function saveErrorMessage(error: unknown): string {
    const body = readApiError(error);
    const status = body?.statusCode ?? 0;
    if (status === 400) {
        if (body?.details && body.details.length > 0) {
            return body.details.join('\n');
        }
        return body?.message || 'Não foi possível salvar o jogo.';
    }
    if (status === 401) {
        return SESSION_EXPIRED_MESSAGE;
    }
    if (status === 409) {
        return 'Já existe um jogo com esse nome.';
    }
    if (status === 502 && body?.error === 'ProviderUnavailableError') {
        return LUDOPEDIA_UNAVAILABLE_MESSAGE;
    }
    return body?.message || 'Não foi possível salvar o jogo.';
}

export function ludopediaErrorMessage(error: unknown, source: LudopediaSource): string {
    const body = readApiError(error);
    const status = body?.statusCode ?? 0;
    if (status === 401) {
        return SESSION_EXPIRED_MESSAGE;
    }
    if (status === 502 && body?.error === 'ProviderUnavailableError') {
        return LUDOPEDIA_UNAVAILABLE_MESSAGE;
    }
    if (source === 'detail' && status === 404) {
        return 'Esse jogo não foi encontrado. O cadastro manual continua disponível.';
    }
    if (source === 'search') {
        return 'Não foi possível buscar jogos na Ludopedia.';
    }
    if (source === 'detail') {
        return 'Não foi possível carregar esse jogo. O cadastro manual continua disponível.';
    }
    return 'Não foi possível carregar as opções da Ludopedia.';
}

function parseApiErrorBody(value: unknown): ApiErrorBody | null {
    if (typeof value !== 'object' || value === null) {
        return null;
    }
    const record = value as Record<string, unknown>;
    if (typeof record['statusCode'] !== 'number') {
        return null;
    }
    if (typeof record['error'] !== 'string') {
        return null;
    }
    if (typeof record['message'] !== 'string') {
        return null;
    }
    const details = record['details'];
    if (
        details !== undefined &&
        !(Array.isArray(details) && details.every((item) => typeof item === 'string'))
    ) {
        return null;
    }
    return {
        statusCode: record['statusCode'],
        error: record['error'],
        message: record['message'],
        ...optionalDetails(details),
    };
}

function optionalDetails(details: unknown): { details: readonly string[] } | Record<string, never> {
    if (details === undefined) {
        return {};
    }
    return { details: details as readonly string[] };
}
