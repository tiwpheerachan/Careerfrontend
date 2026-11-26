import type { AbstractIntlMessages } from 'next-intl';

/** `['nav', 'home.offices']` → `{ nav: {…}, home: { offices: {…} } }`. A name that is not there is left out. */
export function pickMessages(messages: AbstractIntlMessages, namespaces: readonly string[]): AbstractIntlMessages {
  const result: AbstractIntlMessages = {};
  for (const namespace of namespaces) {
    const parts = namespace.split('.');
    let from: AbstractIntlMessages | string | undefined = messages;
    let to = result;
    for (const [i, part] of parts.entries()) {
      from = typeof from === 'object' ? from[part] : undefined;
      if (from === undefined) break;
      if (i === parts.length - 1) to[part] = from;
      else to = (to[part] ??= {}) as AbstractIntlMessages;
    }
  }
  return result;
}
