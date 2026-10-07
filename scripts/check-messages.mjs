import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

/**
 * Every key the code asks for must exist in every language.
 *
 * Comparing the catalogues against each other only proves they agree — it says
 * nothing about whether they answer the questions the app actually asks. This
 * reads the calls instead: a key that was never written shows up as the raw
 * "about.journey.header.title" on screen, which is exactly what the old site
 * shipped with.
 *
 * Two catalogues, checked separately (lib/i18n/request.ts loads one or the
 * other):
 *   the public site   app/**, components/**      messages/{th,en,zh}.json
 *   the admin         app/admin/**, app/sso/**, components/admin/**, components/auth/**
 *                                                 messages/admin/{th,en}.json
 *
 * Same approach as shd_onelink's script.
 */
const CATALOGUES = {
  site: { locales: ['th', 'en', 'zh'], file: (l) => `messages/${l}.json` },
  admin: { locales: ['th', 'en'], file: (l) => `messages/admin/${l}.json` },
};
const messages = Object.fromEntries(
  Object.entries(CATALOGUES).map(([name, c]) => [
    name,
    Object.fromEntries(c.locales.map((l) => [l, JSON.parse(readFileSync(c.file(l), 'utf8'))])),
  ]),
);

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === 'ui' || name === 'node_modules' || name.startsWith('.')) return [];
    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.tsx') ? [path] : [];
  });
}

const isAdmin = (file) =>
  [`app${sep}admin${sep}`, `app${sep}sso${sep}`, `components${sep}admin${sep}`, `components${sep}auth${sep}`].some(
    (dir) => file.startsWith(dir),
  );

const lookup = (catalogue, locale, path) =>
  path.split('.').reduce((node, part) => (node == null ? undefined : node[part]), messages[catalogue][locale]);

const problems = [];
for (const file of [...walk('app'), ...walk('components')]) {
  const catalogue = isAdmin(file) ? 'admin' : 'site';
  const source = readFileSync(file, 'utf8');
  // const t = useTranslations('jobs') / await getTranslations('jobs')
  // -> t('title') is jobs.title. An alias may be bound to several namespaces in
  // one file; a key found under any of them is accepted.
  const namespaces = new Map();
  for (const [, alias, namespace] of source.matchAll(
    /const (\w+) = (?:await )?(?:useTranslations|getTranslations)\(\s*(?:\{[^}]*namespace:\s*)?'([\w.]+)'/g,
  )) {
    namespaces.set(alias, [...(namespaces.get(alias) ?? []), namespace]);
  }

  for (const [alias, candidates] of namespaces) {
    const calls = new RegExp(`\\b${alias}(?:\\.rich|\\.raw)?\\('([\\w.]+)'`, 'g');
    for (const [, key] of source.matchAll(calls)) {
      for (const locale of CATALOGUES[catalogue].locales) {
        const found = candidates.some((ns) => lookup(catalogue, locale, `${ns}.${key}`) !== undefined);
        if (!found) problems.push(`${file}: ${catalogue}/${locale} has no ${candidates.join('|')}.${key}`);
      }
    }
  }
}

if (problems.length) {
  console.error(`${problems.length} missing message(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('ทุก key ที่โค้ดเรียก มีครบ: เว็บ (th, en, zh) · admin (th, en)');
