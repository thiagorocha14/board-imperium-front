import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BACKEND_URL } from '../config/backend-url';
import { CatalogEntry } from './catalog.model';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
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

  it('loads categories with GET and no query string', () => {
    expectCatalog('listCategories', '/categories', [
      { id: '4f1c0c3e-6b1a-4a1e-9c2d-1a2b3c4d5e6f', name: 'estratégia' },
    ]);
  });

  it('loads mechanics with GET and no query string', () => {
    expectCatalog('listMechanics', '/mechanics', [
      { id: '8a9b0c1d-2e3f-4a5b-8c7d-6e5f4a3b2c1d', name: 'draft' },
    ]);
  });
});

function expectCatalog(
  method: 'listCategories' | 'listMechanics',
  path: string,
  items: CatalogEntry[],
): void {
  const backendUrl = 'http://localhost:3000';
  let received: CatalogEntry[] | undefined;
  const service = TestBed.inject(CatalogService);
  service[method]().subscribe((value) => {
    received = value;
  });

  const request = TestBed.inject(HttpTestingController).expectOne(`${backendUrl}${path}`);

  expect(request.request.method).toBe('GET');
  expect(request.request.url).toBe(`${backendUrl}${path}`);
  expect(request.request.urlWithParams).toBe(`${backendUrl}${path}`);
  expect(request.request.params.keys()).toEqual([]);
  request.flush(items);

  expect(received).toEqual(items);
}
