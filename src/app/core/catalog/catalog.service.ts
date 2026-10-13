import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BACKEND_URL } from '@core/config/backend-url';
import { backendPath } from '@core/http/backend-path';
import { CatalogEntry } from '@core/catalog/catalog.model';

@Injectable({ providedIn: 'root' })
export class CatalogService {
    private readonly http = inject(HttpClient);
    private readonly backendUrl = inject(BACKEND_URL);

    listCategories(): Observable<CatalogEntry[]> {
        return this.http.get<CatalogEntry[]>(backendPath(this.backendUrl, '/categories'));
    }

    listMechanics(): Observable<CatalogEntry[]> {
        return this.http.get<CatalogEntry[]>(backendPath(this.backendUrl, '/mechanics'));
    }
}
