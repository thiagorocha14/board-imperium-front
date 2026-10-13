import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { BACKEND_URL } from '@core/config/backend-url';
import { backendPath } from '@core/http/backend-path';
import {
    LudopediaCategoriesResponse,
    LudopediaGameDetail,
    LudopediaGameSearchResponse,
    LudopediaGameSummary,
    LudopediaMechanicsResponse,
    LudopediaNamedItem,
} from '@core/ludopedia/ludopedia.model';

@Injectable({ providedIn: 'root' })
export class LudopediaService {
    private readonly http = inject(HttpClient);
    private readonly backendUrl = inject(BACKEND_URL);

    searchGames(search: string): Observable<LudopediaGameSummary[]> {
        const term = search.trim();
        if (term.length < 2) {
            return of([]);
        }
        const params = new HttpParams().set('search', term).set('page', '1').set('rows', '10');
        return this.http
            .get<LudopediaGameSearchResponse>(backendPath(this.backendUrl, '/ludopedia/games'), {
                params,
            })
            .pipe(map((response) => response.games));
    }

    getGame(ludopediaGameId: number): Observable<LudopediaGameDetail> {
        return this.http.get<LudopediaGameDetail>(
            backendPath(
                this.backendUrl,
                `/ludopedia/games/${encodeURIComponent(String(ludopediaGameId))}`,
            ),
        );
    }

    listCategories(): Observable<LudopediaNamedItem[]> {
        return this.http
            .get<LudopediaCategoriesResponse>(backendPath(this.backendUrl, '/ludopedia/categories'))
            .pipe(map((response) => response.categories));
    }

    listMechanics(): Observable<LudopediaNamedItem[]> {
        return this.http
            .get<LudopediaMechanicsResponse>(backendPath(this.backendUrl, '/ludopedia/mechanics'))
            .pipe(map((response) => response.mechanics));
    }
}
