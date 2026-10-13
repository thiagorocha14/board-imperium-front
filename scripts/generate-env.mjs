import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const environment = {
  backendUrl: process.env.BACKEND_URL ?? '',
  primeUiLicense: process.env.PRIMEUI_LICENSE ?? '',
};

mkdirSync('src/environments', { recursive: true });
writeFileSync(
  'src/environments/environment.ts',
  `// Generated from .env by scripts/generate-env.mjs. Do not edit.
export const environment = ${JSON.stringify(environment, null, 2)} as const;
`,
);
