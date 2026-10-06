/**
 * `{ nav: { about: "About" } }` → `[["nav.about", "About"]]`, in file order.
 * Only string leaves: lists (bullets, partner logos…) are not editable here,
 * as in the old editor — an override replaces one string, never a list.
 */
export function flattenStrings(
  value: unknown,
  prefix = '',
  out: Array<[string, string]> = [],
): Array<[string, string]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [k, v] of Object.entries(value)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.push([key, v]);
    else flattenStrings(v, key, out);
  }
  return out;
}
