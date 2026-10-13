import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BACKEND_URL } from '../config/backend-url';
import { credentialsInterceptor } from './credentials.interceptor';

describe('credentialsInterceptor', () => {
  const backendUrl = 'http://localhost:3000';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: BACKEND_URL, useValue: backendUrl },
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
  });

  it('sends backend calls with credentials', () => {
    TestBed.inject(HttpClient).get(`${backendUrl}/board-games`).subscribe();

    const request = TestBed.inject(HttpTestingController).expectOne(`${backendUrl}/board-games`);
    expect(request.request.withCredentials).toBe(true);
    request.flush([]);
  });

  it('leaves other origins unchanged', () => {
    TestBed.inject(HttpClient).get('https://example.com/games').subscribe();

    const request = TestBed.inject(HttpTestingController).expectOne('https://example.com/games');
    expect(request.request.withCredentials).toBe(false);
    request.flush({});
  });
});
