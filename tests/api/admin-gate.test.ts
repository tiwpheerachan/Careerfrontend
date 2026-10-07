import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every admin page that reads data calls requireAdminPage(need) first.
 *
 * Not a nicety: Next renders a page beside its layout and streams the page's
 * data into the HTML even when the layout shows "not available" — the first
 * admin build leaked applicants' names and emails exactly that way. proxy.ts
 * turns away anyone not signed in as well; this keeps the second wall
 * standing, and is where the per-page permission is checked.
 */
const ROOT = path.resolve('app/admin');

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? pages(full) : name === 'page.tsx' ? [full] : [];
  });
}

/** The body of a top-level exported function, by name pattern. */
function bodyOf(source: string, signature: RegExp): string | undefined {
  const start = source.search(signature);
  if (start < 0) return undefined;
  let depth = 0;
  for (let i = source.indexOf('{', source.indexOf(')', start)); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  return undefined;
}

describe('admin pages are gated', () => {
  for (const file of pages(ROOT)) {
    const source = readFileSync(file, 'utf8');
    if (!/store\(\)/.test(source)) continue;
    const name = path.relative(ROOT, file);

    it(`${name}: the page calls requireAdminPage(…) before anything else`, () => {
      const page = bodyOf(source, /export default async function/);
      expect(page, 'default export must be an async function').toBeDefined();
      const firstStatement = page!.slice(page!.indexOf('{', page!.indexOf(')')) + 1).trim();
      // `await requireAdminPage(need)`, optionally bound: `const actor = await requireAdminPage(…)`.
      expect(firstStatement).toMatch(/^(const \w+ = )?await requireAdminPage\(/);
    });

    const metadata = bodyOf(source, /export async function generateMetadata/);
    if (metadata && /load\(|store\(\)/.test(metadata)) {
      it(`${name}: generateMetadata reads data only after requireAdminPage(…)`, () => {
        expect(metadata.indexOf('requireAdminPage(')).toBeGreaterThan(-1);
        expect(metadata.indexOf('requireAdminPage(')).toBeLessThan(metadata.search(/load\(|store\(\)/));
      });
    }
  }
});
