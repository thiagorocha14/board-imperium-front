import { BoardGame } from '../../core/board-games/board-game.model';
import { LudopediaGameDetail } from '../../core/ludopedia/ludopedia.model';
import {
  formPatchFromLudopediaDetail,
  formValueFromBoardGame,
  RegisterGameFormValue,
  toCreateBoardGameRequest,
  toUpdateBoardGameRequest,
} from './register-game-form';

describe('formPatchFromLudopediaDetail', () => {
  it('keeps null numbers empty and preselects category and mechanic ids', () => {
    const detail: LudopediaGameDetail = {
      id: 42,
      name: 'Azul',
      imageUrl: null,
      link: null,
      minPlayers: null,
      maxPlayers: 4,
      playTimeMinutes: null,
      publishedYear: null,
      minAge: null,
      complexity: null,
      categories: [
        { id: 4, name: 'estratégia' },
        { id: 8, name: 'família' },
      ],
      mechanics: [{ id: 15, name: 'draft' }],
    };

    const patch = formPatchFromLudopediaDetail(detail);

    expect(patch).toEqual({
      name: 'Azul',
      imageUrl: '',
      complexity: null,
      playTimeMinutes: null,
      minPlayers: null,
      maxPlayers: 4,
      categoryIds: [4, 8],
      mechanicIds: [15],
    });
    expect(Object.keys(patch)).not.toContain('level');
    expect(Object.keys(patch)).not.toContain('purchasedAt');
  });
});

describe('toCreateBoardGameRequest', () => {
  it('trims the name, drops categories and mechanics, and nulls empty optionals', () => {
    const value: RegisterGameFormValue = {
      name: '  Azul  ',
      level: 4,
      complexity: 2.5,
      playTimeMinutes: 45,
      minPlayers: 2,
      maxPlayers: 4,
      categoryIds: [4, 8],
      mechanicIds: [15],
      purchasedAt: null,
      imageUrl: '   ',
    };

    const payload = toCreateBoardGameRequest(value);

    expect(payload).toEqual({
      name: 'Azul',
      level: 4,
      complexity: 2.5,
      playTimeMinutes: 45,
      minPlayers: 2,
      maxPlayers: 4,
      purchasedAt: null,
      imageUrl: null,
    });
    expect(Object.keys(payload).sort()).toEqual([
      'complexity',
      'imageUrl',
      'level',
      'maxPlayers',
      'minPlayers',
      'name',
      'playTimeMinutes',
      'purchasedAt',
    ]);
  });

  it('keeps a purchase date and an absolute image url', () => {
    const value: RegisterGameFormValue = {
      name: 'Catan',
      level: 1,
      complexity: 2.25,
      playTimeMinutes: 90,
      minPlayers: 3,
      maxPlayers: 4,
      categoryIds: [9],
      mechanicIds: [],
      purchasedAt: new Date(2024, 4, 1),
      imageUrl: ' https://cdn.example/catan.png ',
    };

    expect(toCreateBoardGameRequest(value)).toEqual({
      name: 'Catan',
      level: 1,
      complexity: 2.25,
      playTimeMinutes: 90,
      minPlayers: 3,
      maxPlayers: 4,
      purchasedAt: '2024-05-01',
      imageUrl: 'https://cdn.example/catan.png',
    });
  });
});

describe('formValueFromBoardGame', () => {
  it('keeps the purchase day in local time and turns a missing image into an empty string', () => {
    const value = formValueFromBoardGame(boardGame());

    expect(value.purchasedAt).toEqual(new Date(2024, 0, 15));
    expect(value.purchasedAt?.getFullYear()).toBe(2024);
    expect(value.purchasedAt?.getMonth()).toBe(0);
    expect(value.purchasedAt?.getDate()).toBe(15);
    expect(value.imageUrl).toBe('');
    expect(value.categoryIds).toEqual(['4f1c0c3e-6b1a-4a1e-9c2d-1a2b3c4d5e6f']);
    expect(value.mechanicIds).toEqual([]);
  });

  it('keeps a null purchase date as null', () => {
    expect(formValueFromBoardGame(boardGame({ purchasedAt: null })).purchasedAt).toBeNull();
  });
});

describe('toUpdateBoardGameRequest', () => {
  it('sends the full body, including null optionals and empty taxonomy lists', () => {
    expect(toUpdateBoardGameRequest(formValueFromBoardGame(boardGame()))).toEqual({
      name: 'Azul',
      level: 4,
      complexity: 2.5,
      playTimeMinutes: 45,
      minPlayers: 2,
      maxPlayers: 4,
      purchasedAt: '2024-01-15',
      imageUrl: null,
      categoryIds: ['4f1c0c3e-6b1a-4a1e-9c2d-1a2b3c4d5e6f'],
      mechanicIds: [],
    });
  });
});

function boardGame(overrides: Partial<BoardGame> = {}): BoardGame {
  return {
    id: '11111111-2222-4333-8444-555555555555',
    name: 'Azul',
    level: 4,
    complexity: 2.5,
    playTimeMinutes: 45,
    minPlayers: 2,
    maxPlayers: 4,
    purchasedAt: '2024-01-15',
    imageUrl: null,
    categoryIds: ['4f1c0c3e-6b1a-4a1e-9c2d-1a2b3c4d5e6f'],
    mechanicIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}
