import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BACKEND_URL } from '../config/backend-url';
import {
  BoardGame,
  BoardGameCollectionItem,
  BoardGameDrawQuery,
  UpdateBoardGameRequest,
} from './board-game.model';
import { BoardGameService } from './board-game.service';

describe('BoardGameService', () => {
  const backendUrl = 'http://localhost:3000';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: BACKEND_URL, useValue: backendUrl },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('loads the collection with GET and no query string', () => {
    const games: BoardGameCollectionItem[] = [
      {
        id: '4f1c0c3e-6b1a-4a1e-9c2d-1a2b3c4d5e6f',
        name: 'Azul',
        level: 3,
        purchasedAt: '2024-01-15',
        imageUrl: 'https://example.com/azul.jpg',
      },
    ];
    let received: BoardGameCollectionItem[] | undefined;
    TestBed.inject(BoardGameService)
      .listCollection()
      .subscribe((items) => {
        received = items;
      });

    const request = TestBed.inject(HttpTestingController).expectOne(
      `${backendUrl}/board-games/collection`,
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.url).toBe(`${backendUrl}/board-games/collection`);
    expect(request.request.urlWithParams).toBe(`${backendUrl}/board-games/collection`);
    expect(request.request.params.keys()).toEqual([]);
    expect(request.request.url).not.toContain('userId');
    request.flush(games);

    expect(received).toEqual(games);
  });

  it('loads one game with GET and no user id', () => {
    const id = '4f1c0c3e-6b1a-4a1e-9c2d-1a2b3c4d5e6f';
    const game = sampleGame(id);
    let received: BoardGame | undefined;
    TestBed.inject(BoardGameService)
      .get(id)
      .subscribe((item) => {
        received = item;
      });

    const request = TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/board-games/${id}`);

    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();
    expect(request.request.params.keys()).toEqual([]);
    expect(request.request.url).not.toContain('userId');
    request.flush(game);

    expect(received).toEqual(game);
  });

  it('updates a game with PATCH and the given body', () => {
    const id = '4f1c0c3e-6b1a-4a1e-9c2d-1a2b3c4d5e6f';
    const payload: UpdateBoardGameRequest = {
      name: 'Azul',
      level: 4,
      complexity: 2.5,
      playTimeMinutes: 45,
      minPlayers: 2,
      maxPlayers: 4,
      purchasedAt: null,
      imageUrl: null,
      categoryIds: [],
      mechanicIds: [],
    };
    const game = sampleGame(id);
    let received: BoardGame | undefined;
    TestBed.inject(BoardGameService)
      .update(id, payload)
      .subscribe((item) => {
        received = item;
      });

    const request = TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/board-games/${id}`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(payload);
    expect(request.request.url).not.toContain('userId');
    request.flush(game);

    expect(received).toEqual(game);
  });

  it('draws with only the level query param', () => {
    expectDraw({ level: 3 }, 'level', '3');
  });

  it('draws with only the categoryId query param', () => {
    expectDraw(
      { categoryId: '4f1c0c3e-6b1a-4a1e-9c2d-1a2b3c4d5e6f' },
      'categoryId',
      '4f1c0c3e-6b1a-4a1e-9c2d-1a2b3c4d5e6f',
    );
  });

  it('draws with only the mechanicId query param', () => {
    expectDraw(
      { mechanicId: '8a9b0c1d-2e3f-4a5b-8c7d-6e5f4a3b2c1d' },
      'mechanicId',
      '8a9b0c1d-2e3f-4a5b-8c7d-6e5f4a3b2c1d',
    );
  });
});

function sampleGame(id: string): BoardGame {
  return {
    id,
    name: 'Azul',
    level: 3,
    complexity: 2.1,
    playTimeMinutes: 45,
    minPlayers: 2,
    maxPlayers: 4,
    purchasedAt: null,
    imageUrl: 'https://example.com/azul.jpg',
    categoryIds: ['4f1c0c3e-6b1a-4a1e-9c2d-1a2b3c4d5e6f'],
    mechanicIds: ['8a9b0c1d-2e3f-4a5b-8c7d-6e5f4a3b2c1d'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };
}

function expectDraw(query: BoardGameDrawQuery, key: string, value: string): void {
  const backendUrl = 'http://localhost:3000';
  const game: BoardGame = {
    id: 'game-1',
    name: 'Azul',
    level: 3,
    complexity: 2.1,
    playTimeMinutes: 45,
    minPlayers: 2,
    maxPlayers: 4,
    purchasedAt: null,
    imageUrl: 'https://example.com/azul.jpg',
    categoryIds: ['4f1c0c3e-6b1a-4a1e-9c2d-1a2b3c4d5e6f'],
    mechanicIds: ['8a9b0c1d-2e3f-4a5b-8c7d-6e5f4a3b2c1d'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };
  let received: BoardGame | undefined;
  TestBed.inject(BoardGameService)
    .draw(query)
    .subscribe((item) => {
      received = item;
    });

  const request = TestBed.inject(HttpTestingController).expectOne(
    (candidate) => candidate.url === `${backendUrl}/board-games/draw`,
  );

  expect(request.request.method).toBe('GET');
  expect(request.request.url).toBe(`${backendUrl}/board-games/draw`);
  expect(request.request.params.keys()).toEqual([key]);
  expect(request.request.params.get(key)).toBe(value);
  expect(request.request.url).not.toContain('userId');
  request.flush(game);

  expect(received).toEqual(game);
}
