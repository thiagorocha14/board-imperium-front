import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

const APP_NAME = 'nossos jogos';

@Injectable()
export class AppTitleStrategy extends TitleStrategy {
    private readonly documentTitle = inject(Title);

    override updateTitle(snapshot: RouterStateSnapshot): void {
        this.buildTitle(snapshot);
        this.documentTitle.setTitle(APP_NAME);
    }
}
