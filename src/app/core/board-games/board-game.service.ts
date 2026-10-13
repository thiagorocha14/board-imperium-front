import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BACKEND_URL } from '../config/backend-url';
import { backendPath } from '../http/backend-path';
import {
  BoardGame,
  BoardGameCollectionItem,
  BoardGameDrawQuery,
  CreateBoardGameRequest,
  UpdateBoardGameRequest,
} from './board-game.model';

@Injectable({ providedIn: 'root' })
export class BoardGameService {
  private readonly http = inject(HttpClient);
  private readonly backendUrl = inject(BACKEND_URL);

  create(payload: CreateBoardGameRequest): Observable<BoardGame> {
    return this.http.post<BoardGame>(backendPath(this.backendUrl, '/board-games'), payload);
  }

  get(id: string): Observable<BoardGame> {
    return this.http.get<BoardGame>(this.gamePath(id));
  }

  update(id: string, payload: UpdateBoardGameRequest): Observable<BoardGame> {
    return this.http.patch<BoardGame>(this.gamePath(id), payload);
  }

  listCollection(): Observable<BoardGameCollectionItem[]> {
    return this.http.get<BoardGameCollectionItem[]>(
      backendPath(this.backendUrl, '/board-games/collection'),
    );
  }

  draw(query: BoardGameDrawQuery): Observable<BoardGame> {
    return this.http.get<BoardGame>(backendPath(this.backendUrl, '/board-games/draw'), {
      params: drawParams(query),
    });
  }

  private gamePath(id: string): string {
    return backendPath(this.backendUrl, `/board-games/${encodeURIComponent(id)}`);
  }
}

function drawParams(query: BoardGameDrawQuery): HttpParams {
  if ('level' in query) return new HttpParams().set('level', query.level);
  if ('categoryId' in query) return new HttpParams().set('categoryId', query.categoryId);
  return new HttpParams().set('mechanicId', query.mechanicId);
}
