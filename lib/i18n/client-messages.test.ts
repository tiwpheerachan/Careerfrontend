import { existsSync, globSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCALES } from '@/lib/constants';
import { COMMON_NAMESPACES } from './client-messages';
import { pickMessages } from './pick-messages';

const ROOT = path.resolve(import.meta.dirname, '../..');
const PUBLIC = path.join(ROOT, 'app/[locale]');

/** A file of ours an import names, or nothing (a package, a stylesheet). */
function fileOf(specifier: string, from: string): string | undefined {
  const base = specifier.startsWith('@/')
    ? path.join(ROOT, specifier.slice(2))
    : specifier.startsWith('.')
      ? path.resolve(path.dirname(from), specifier)
      : undefined;
  if (!base) return undefined;
  return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find(
    (file) => /\.tsx?$/.test(file) && existsSync(file) && statSync(file).isFile(),
  );
}

/** The namespaces asked for by everything that runs in the browser below `file`. */
function clientNamespaces(file: string, inClient = false, seen = new Set<string>()): Set<string> {
  const source = readFileSync(file, 'utf8');
  const client = inClient || /^\s*(\/\*[\s\S]*?\*\/\s*)?['"]use client['"]/.test(source);
  const id = `${client}:${file}`;
  if (seen.has(id)) return new Set();
  seen.add(id);
  const found = new Set<string>();
  if (client) for (const [, ns] of source.matchAll(/useTranslations\(\s*['"]([^'"]+)['"]/g)) found.add(ns!);
  for (const [, specifier] of source.matchAll(/(?:from|import\()\s*['"]([^'"]+)['"]/g)) {
    const next = fileOf(specifier!, file);
    if (next) for (const ns of clientNamespaces(next, client, seen)) found.add(ns);
  }
  return found;
}

const covered = (ns: string, given: string[]) => given.some((g) => ns === g || ns.startsWith(`${g}.`));
const missing = (file: string, given: string[]) => [...clientNamespaces(file)].filter((ns) => !covered(ns, given));

describe('the messages sent to the browser', () => {
  const files = globSync('**/{page,layout,error,not-found,loading}.tsx', { cwd: PUBLIC }).map((f) =>
    path.join(PUBLIC, f),
  );

  it.each(files.map((f) => [path.relative(PUBLIC, f), f] as const))(
    '%s: none its components use is left out',
    (_, f) => {
      const use = [...readFileSync(f, 'utf8').matchAll(/<ClientMessages use=\{(\[[^\]]*\])\}/g)].flatMap(([, list]) =>
        [...list!.matchAll(/'([^']+)'/g)].map(([, ns]) => ns!),
      );
      expect(missing(f, [...COMMON_NAMESPACES, ...use])).toEqual([]);
      // The names are real ones, in every language.
      for (const locale of LOCALES) {
        const messages = JSON.parse(readFileSync(path.join(ROOT, `messages/${locale}.json`), 'utf8'));
        for (const ns of use)
          expect(
            ns.split('.').reduce((node, key) => node?.[key], messages),
            ns,
          ).toBeDefined();
      }
    },
  );

  it('the check sees what it should', () => {
    expect([...clientNamespaces(path.join(PUBLIC, 'layout.tsx'))]).toContain('nav');
    expect(missing(path.join(PUBLIC, 'page.tsx'), [])).toContain('home.offices');
  });

  it('picks whole sections and parts of one, and nothing else', () => {
    const messages = { nav: { a: '1' }, home: { offices: { b: '2' }, hero: { c: '3' } } };
    expect(pickMessages(messages, ['nav', 'home.offices', 'nope.x', 'nav.a.b'])).toEqual({
      nav: { a: '1' },
      home: { offices: { b: '2' } },
    });
  });
});
