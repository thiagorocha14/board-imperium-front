import { AbstractControl, FormControl, FormGroup, ValidationErrors } from '@angular/forms';
import {
  BoardGame,
  CreateBoardGameRequest,
  UpdateBoardGameRequest,
} from '../../core/board-games/board-game.model';
import { LudopediaGameDetail } from '../../core/ludopedia/ludopedia.model';

export const GAME_IMAGE_URL_MAX = 2048;

export interface RegisterGameFormValue {
  name: string;
  complexity: number | null;
  level: number | null;
  playTimeMinutes: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  categoryIds: number[];
  mechanicIds: number[];
  purchasedAt: Date | null;
  imageUrl: string;
}

export interface LudopediaFormPatch {
  name: string;
  complexity: number | null;
  playTimeMinutes: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  categoryIds: number[];
  mechanicIds: number[];
  imageUrl: string;
}

export interface RegisterGameForm {
  name: FormControl<string>;
  complexity: FormControl<number | null>;
  level: FormControl<number | null>;
  playTimeMinutes: FormControl<number | null>;
  minPlayers: FormControl<number | null>;
  maxPlayers: FormControl<number | null>;
  categoryIds: FormControl<number[] | string[]>;
  mechanicIds: FormControl<number[] | string[]>;
  purchasedAt: FormControl<Date | null>;
  imageUrl: FormControl<string>;
}

export interface GameFormSnapshot {
  name: string;
  complexity: number | null;
  level: number | null;
  playTimeMinutes: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  categoryIds: number[] | string[];
  mechanicIds: number[] | string[];
  purchasedAt: Date | null;
  imageUrl: string;
}

export interface EditGameFormValue {
  name: string;
  complexity: number | null;
  level: number | null;
  playTimeMinutes: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  categoryIds: string[];
  mechanicIds: string[];
  purchasedAt: Date | null;
  imageUrl: string;
}

export function emptyRegisterGameForm(): RegisterGameFormValue {
  return {
    name: '',
    complexity: null,
    level: 3,
    playTimeMinutes: null,
    minPlayers: null,
    maxPlayers: null,
    categoryIds: [],
    mechanicIds: [],
    purchasedAt: null,
    imageUrl: '',
  };
}

export function createRegisterGameForm(): FormGroup<RegisterGameForm> {
  return new FormGroup<RegisterGameForm>(
    {
      name: new FormControl('', { nonNullable: true, validators: [nameValidator] }),
      complexity: new FormControl<number | null>(null, { validators: [complexityValidator] }),
      level: new FormControl<number | null>(3, { validators: [levelValidator] }),
      playTimeMinutes: new FormControl<number | null>(null, {
        validators: [requiredIntegerAtLeast1],
      }),
      minPlayers: new FormControl<number | null>(null, { validators: [requiredIntegerAtLeast1] }),
      maxPlayers: new FormControl<number | null>(null, { validators: [requiredIntegerAtLeast1] }),
      categoryIds: new FormControl<number[] | string[]>([], { nonNullable: true }),
      mechanicIds: new FormControl<number[] | string[]>([], { nonNullable: true }),
      purchasedAt: new FormControl<Date | null>(null, { validators: [purchaseDateValidator] }),
      imageUrl: new FormControl('', { nonNullable: true, validators: [imageUrlValidator] }),
    },
    { validators: [playerRangeValidator] },
  );
}

export function formPatchFromLudopediaDetail(detail: LudopediaGameDetail): LudopediaFormPatch {
  return {
    name: detail.name,
    complexity: detail.complexity,
    playTimeMinutes: detail.playTimeMinutes,
    minPlayers: detail.minPlayers,
    maxPlayers: detail.maxPlayers,
    categoryIds: detail.categories.map((item) => item.id),
    mechanicIds: detail.mechanics.map((item) => item.id),
    imageUrl: detail.imageUrl ?? '',
  };
}

export function formValueFromBoardGame(game: BoardGame): EditGameFormValue {
  return {
    name: game.name,
    complexity: game.complexity,
    level: game.level,
    playTimeMinutes: game.playTimeMinutes,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    categoryIds: [...game.categoryIds],
    mechanicIds: [...game.mechanicIds],
    purchasedAt: parsePurchaseDate(game.purchasedAt),
    imageUrl: game.imageUrl ?? '',
  };
}

export function parsePurchaseDate(value: string | null): Date | null {
  if (value == null) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day);
}

/**
 * Local category and mechanic UUIDs do not exist yet.
 * Ludopedia integer ids must stay off POST /board-games.
 */
export function toCreateBoardGameRequest(value: {
  name: string;
  level: number | null;
  complexity: number | null;
  playTimeMinutes: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  purchasedAt: Date | null;
  imageUrl: string;
}): CreateBoardGameRequest {
  if (
    value.level == null ||
    value.complexity == null ||
    value.playTimeMinutes == null ||
    value.minPlayers == null ||
    value.maxPlayers == null
  ) {
    throw new Error('Register game form is incomplete');
  }
  return {
    name: value.name.trim(),
    level: Number(value.level),
    complexity: Number(value.complexity.toFixed(2)),
    playTimeMinutes: value.playTimeMinutes,
    minPlayers: value.minPlayers,
    maxPlayers: value.maxPlayers,
    purchasedAt: formatPurchaseDate(value.purchasedAt),
    imageUrl: blankToNull(value.imageUrl),
  };
}

export function toUpdateBoardGameRequest(value: EditGameFormValue): UpdateBoardGameRequest {
  return {
    ...toCreateBoardGameRequest(value),
    categoryIds: [...value.categoryIds],
    mechanicIds: [...value.mechanicIds],
  };
}

export function asEditGameFormValue(value: GameFormSnapshot): EditGameFormValue {
  return {
    name: value.name,
    complexity: value.complexity,
    level: value.level,
    playTimeMinutes: value.playTimeMinutes,
    minPlayers: value.minPlayers,
    maxPlayers: value.maxPlayers,
    purchasedAt: value.purchasedAt,
    imageUrl: value.imageUrl,
    categoryIds: stringIds(value.categoryIds),
    mechanicIds: stringIds(value.mechanicIds),
  };
}

export function imageUrlIssue(value: string): 'length' | 'format' | 'credentials' | null {
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > GAME_IMAGE_URL_MAX) return 'length';
  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return 'format';
  }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.hostname.length === 0) {
    return 'format';
  }
  if (url.username.length > 0 || url.password.length > 0) return 'credentials';
  return null;
}

export function formatPurchaseDate(value: Date | null): string | null {
  if (value == null || Number.isNaN(value.getTime())) return null;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function stringIds(ids: readonly (number | string)[]): string[] {
  return ids.filter((id): id is string => typeof id === 'string');
}

function blankToNull(value: string): string | null {
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}

function nameValidator(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (typeof value !== 'string') return { required: true };
  const name = value.trim();
  if (name.length < 1) return { required: true };
  if (name.length > 150) return { maxlength: true };
  return null;
}

function complexityValidator(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (value == null || value === '') return { required: true };
  if (typeof value !== 'number' || !Number.isFinite(value)) return { complexity: true };
  const normalized = Number(value.toFixed(2));
  if (Math.abs(normalized - value) > 1e-8 || normalized < 1 || normalized > 5) {
    return { complexity: true };
  }
  return null;
}

function levelValidator(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (value == null || value === '') return { required: true };
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
    return { level: true };
  }
  return null;
}

function requiredIntegerAtLeast1(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (value == null || value === '') return { required: true };
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) return { integer: true };
  return null;
}

function purchaseDateValidator(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (value == null || value === '') return null;
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return { purchasedAt: true };
  if (isAfterToday(value)) return { purchasedAt: true };
  return null;
}

function playerRangeValidator(control: AbstractControl): ValidationErrors | null {
  const min: unknown = control.get('minPlayers')?.value;
  const max: unknown = control.get('maxPlayers')?.value;
  if (typeof min !== 'number' || typeof max !== 'number') return null;
  if (max < min) return { belowMin: true };
  return null;
}

function imageUrlValidator(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (typeof value !== 'string' || imageUrlIssue(value) == null) return null;
  return { imageUrl: true };
}

function isAfterToday(value: Date, now = new Date()): boolean {
  const selected = Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return selected > today;
}
