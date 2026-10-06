import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every key the code asks for must exist in every language.
 *
 * Comparing the catalogues against each other only proves they agree — it says
 * nothing about whether they answer the questions the app actually asks. This
 * reads the calls instead: a key that was never written shows up as the raw
 * "about.journey.header.title" on screen, which is exactly what the old site
 * shipped with.
 *
 * Same approach as shd_onelink's script; the locales are this site's.
 */
const LOCALES = ['th', 'en', 'zh'];
const messages = Object.fromEntries(LOCALES.map((l) => [l, JSON.parse(readFileSync(`messages/${l}.json`, 'utf8'))]));

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === 'ui' || name === 'node_modules' || name.startsWith('.')) return [];
    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.tsx') ? [path] : [];
  });
}

const lookup = (locale, path) =>
  path.split('.').reduce((node, part) => (node == null ? undefined : node[part]), messages[locale]);

const problems = [];
for (const file of [...walk('app'), ...walk('components')]) {
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
      for (const locale of LOCALES) {
        const found = candidates.some((ns) => lookup(locale, `${ns}.${key}`) !== undefined);
        if (!found) problems.push(`${file}: ${locale} has no ${candidates.join('|')}.${key}`);
      }
    }
  }
}

if (problems.length) {
  console.error(`${problems.length} missing message(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`ทุก key ที่โค้ดเรียก มีครบทั้ง ${LOCALES.length} ภาษา (${LOCALES.join(', ')})`);
