import IntlMessageFormat from 'intl-messageformat';

/**
 * Checks an edited site text (site_content override) before it is saved.
 *
 * The public site formats every message with ICU MessageFormat (next-intl).
 * An override that does not parse — `แกลเลอรีแถวบน {n` — or that asks for a
 * value the page never passes — `{count}` where the page gives `{n}` — makes
 * next-intl give up and show the raw key instead of any text. So an override
 * must
 *   - not be empty (going back to the built-in text is "revert");
 *   - parse as ICU MessageFormat;
 *   - keep every {argument} the built-in text has, and add none;
 *   - use no <tag> the built-in text does not have (dropping one is fine: the
 *     page's tag function is simply not called).
 *
 * The same rules run in the browser (the editor, before saving) and on the
 * server (PUT /api/v1/admin/content), so both say the same thing.
 */
export type ContentProblem =
  { code: 'empty' } | { code: 'syntax' } | { code: 'missing'; names: string[] } | { code: 'unknown'; names: string[] };

type Ast = ReturnType<IntlMessageFormat['getAst']>;

// The parser's element types (TYPE in @formatjs/icu-messageformat-parser).
const ARGUMENT = 1;
const NUMBER = 2;
const DATE = 3;
const TIME = 4;
const SELECT = 5;
const PLURAL = 6;
const TAG = 8;

interface Names {
  args: Set<string>;
  tags: Set<string>;
}

function collect(elements: Ast, names: Names): Names {
  for (const el of elements) {
    switch (el.type) {
      case ARGUMENT:
      case NUMBER:
      case DATE:
      case TIME:
        names.args.add(el.value);
        break;
      case SELECT:
      case PLURAL:
        names.args.add(el.value);
        for (const option of Object.values(el.options)) collect(option.value, names);
        break;
      case TAG:
        names.tags.add(el.value);
        collect(el.children, names);
        break;
    }
  }
  return names;
}

/** The argument and tag names a message uses, or null when it is not valid ICU. */
export function messageNames(message: string, locale: string): Names | null {
  try {
    const ast = new IntlMessageFormat(message, locale).getAst();
    return collect(ast, { args: new Set(), tags: new Set() });
  } catch {
    return null;
  }
}

/**
 * What is wrong with `value` as the override of a key whose built-in text is
 * `defaultText` (undefined: a key the site no longer has — only the syntax is
 * checked), or null when it can be saved.
 */
export function checkOverride(value: string, defaultText: string | undefined, locale: string): ContentProblem | null {
  if (!value.trim()) return { code: 'empty' };
  // A built-in text that is not ICU itself is read raw by its page; anything goes.
  const expected = defaultText === undefined ? undefined : messageNames(defaultText, locale);
  if (defaultText !== undefined && expected === null) return null;

  const found = messageNames(value, locale);
  if (!found) return { code: 'syntax' };
  if (!expected) return null;

  const missing = [...expected.args].filter((name) => !found.args.has(name));
  if (missing.length) return { code: 'missing', names: missing };
  const unknown = [
    ...[...found.args].filter((name) => !expected.args.has(name)),
    ...[...found.tags].filter((name) => !expected.tags.has(name)).map((name) => `<${name}>`),
  ];
  if (unknown.length) return { code: 'unknown', names: unknown };
  return null;
}

/** `{n}, {count}` — how the names are shown in a message. */
export const listNames = (names: string[]) => names.map((n) => (n.startsWith('<') ? n : `{${n}}`)).join(', ');

/**
 * The problem in words, from the admin's `content` messages (errors.*) —
 * `t` is that namespace's translator, on the server or in the editor.
 */
export function describeProblem(
  problem: ContentProblem,
  t: (key: string, values?: Record<string, string>) => string,
): string {
  switch (problem.code) {
    case 'empty':
      return t('errors.empty');
    case 'syntax':
      return t('errors.syntax');
    case 'missing':
      return t('errors.missing', { names: listNames(problem.names) });
    case 'unknown':
      return t('errors.unknown', { names: listNames(problem.names) });
  }
}
