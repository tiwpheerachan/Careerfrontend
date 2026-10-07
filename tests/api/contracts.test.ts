import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Endpoint } from '@/lib/api/contract';
import { ENDPOINTS } from '@/lib/api/contracts';
import { openapi } from '@/lib/api/openapi';

/**
 * The contract list and the route files must describe the same API: every
 * exported GET/POST/… in app/api/v1 has a contract (so it is in the docs), and
 * every contract has a route (so the docs promise nothing that is missing).
 */
const ROOT = path.resolve('app/api/v1');
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? routeFiles(full) : name === 'route.ts' ? [full] : [];
  });
}

function routesInCode(): string[] {
  return routeFiles(ROOT).flatMap((file) => {
    const route = `/${path.relative(ROOT, path.dirname(file))}`.replace(/\[(\w+)\]/g, '{$1}').replace(/\/$/, '');
    const source = readFileSync(file, 'utf8');
    return METHODS.filter((m) => new RegExp(`export (const|async function) ${m}\\b`).test(source)).map(
      (m) => `${m} ${route}`,
    );
  });
}

describe('API contracts', () => {
  it('match the route files exactly', () => {
    const inContracts = ENDPOINTS.map((e) => `${e.method.toUpperCase()} ${e.path}`).sort();
    expect(routesInCode().sort()).toEqual(inContracts);
  });

  it('build a valid-looking OpenAPI document', () => {
    const doc = openapi();
    expect(doc.openapi).toBe('3.0.3');
    for (const [route, item] of Object.entries(doc.paths)) {
      for (const [method, op] of Object.entries(item) as Array<[string, { responses: object; summary: string }]>) {
        expect(op.summary, `${method} ${route}`).toBeTruthy();
        expect(Object.keys(op.responses).length, `${method} ${route}`).toBeGreaterThan(0);
      }
    }
  });
});

/**
 * The permission the docs promise is the one the route checks. Each admin
 * method's handler must open with requireAdmin(request, { resource, level })
 * matching the contract's `permission` — or plain requireAdmin(request) when
 * the contract names none (any access to the admin).
 */
describe('admin permissions match their contracts', () => {
  for (const endpoint of (ENDPOINTS as readonly Endpoint[]).filter((e) => e.auth === 'admin')) {
    const method = endpoint.method.toUpperCase();
    it(`${method} ${endpoint.path} checks ${endpoint.permission ?? 'any admin access'}`, () => {
      const file = path.join(ROOT, endpoint.path.replace(/\{(\w+)\}/g, '[$1]'), 'route.ts');
      const source = readFileSync(file, 'utf8');
      const start = source.search(new RegExp(`export const ${method}\\b`));
      expect(start, `${method} in ${file}`).toBeGreaterThan(-1);
      const next = source.slice(start + 1).search(/\nexport const /);
      const handler = next < 0 ? source.slice(start) : source.slice(start, start + 1 + next);
      const [resource, level] = endpoint.permission?.split('.') ?? [];
      expect(handler).toContain(
        endpoint.permission
          ? `requireAdmin(request, { resource: '${resource}', level: '${level}' })`
          : 'requireAdmin(request)',
      );
    });
  }
});
