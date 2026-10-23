import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
const fallback = config.rewrites.find(route => route.destination === '/index.html');
// The fallback uses one regex group with a negative lookahead, not named path parameters.
const servesSpa = pathname => new RegExp(`^${fallback.source}$`).test(pathname);

describe('Vercel SPA deployment boundaries', () => {
  it('leaves Vercel platform endpoints to the platform instead of serving HTML as JavaScript', () => {
    for (const path of ['/_vercel/insights/script.js', '/_vercel/insights/view', '/_vercel/speed-insights/script.js', '/_vercel/other']) {
      expect(servesSpa(path), path).toBe(false);
    }
  });

  it('leaves existing and missing build assets out of the HTML fallback', () => {
    for (const path of ['/assets/index-example.js', '/assets/missing-lesson.js', '/assets/app.css', '/assets/icon.svg']) {
      expect(servesSpa(path), path).toBe(false);
    }
  });

  it('keeps direct entry to lessons, modules and the client-side not-found page', () => {
    for (const path of ['/', '/learn', '/learn/enums', '/learn/interfaces', '/parking-lot', '/unknown-route']) {
      expect(servesSpa(path), path).toBe(true);
    }
  });

  it('preserves API, Swagger and metadata boundaries', () => {
    for (const path of ['/api/kvstore/key', '/swagger-ui.html', '/swagger-ui/index.html', '/v3/api-docs', '/robots.txt', '/sitemap.xml', '/og.png', '/favicon.svg']) {
      expect(servesSpa(path), path).toBe(false);
    }
    expect(config.rewrites.filter(route => route.destination.startsWith('https://lld-backend-e5e7.onrender.com/'))).toHaveLength(4);
  });
});
