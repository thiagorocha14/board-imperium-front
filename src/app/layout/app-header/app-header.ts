import { ChangeDetectionStrategy, Component, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { headingForUrl, LOGIN_PATH } from '@core/navigation/app-screens';
import { HeaderActions } from '@layout/header-actions/header-actions';

@Component({
    selector: 'app-header',
    imports: [HeaderActions],
    templateUrl: './app-header.html',
    styleUrl: './app-header.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeader {
    private readonly router = inject(Router);

    private readonly url = toSignal(
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            map((event) => event.urlAfterRedirects),
        ),
        { initialValue: this.router.url },
    );

    protected readonly heading = linkedSignal({
        source: this.url,
        computation: (url, previous) => {
            if (isLoginRoute(url)) {
                return previous?.value ?? 'nossos jogos';
            }
            return headingForUrl(url);
        },
    });
}

function isLoginRoute(url: string): boolean {
    const pathOnly = url.split(/[?#]/)[0] ?? '';
    return pathOnly.replace(/^\/+|\/+$/g, '') === LOGIN_PATH;
}
