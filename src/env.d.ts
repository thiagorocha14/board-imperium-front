declare interface Env {
    readonly NODE_ENV: string;
    readonly NG_APP_ENV: string;
    readonly NG_APP_BACKEND_URL: string;
    readonly NG_APP_PRIMEUI_LICENSE: string;
}

declare interface ImportMeta {
    readonly env: Env;
}
