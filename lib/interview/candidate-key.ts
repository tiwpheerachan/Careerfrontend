/**
 * Which evaluations belong to the same person: the same application, the same
 * application form, or — when the candidate was typed in by hand — the same
 * name (trimmed, case-insensitive). One string, for urls and the PDF query.
 *
 *   application:<uuid>   form:<uuid>   name:<the name>
 */
export type CandidateRef =
  { kind: 'application'; id: string } | { kind: 'form'; id: string } | { kind: 'manual'; name: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function candidateKey(candidate: {
  kind: 'application' | 'form' | 'manual';
  id: string | null;
  name: string;
}): string {
  if (candidate.kind !== 'manual' && candidate.id) return `${candidate.kind}:${candidate.id}`;
  return `name:${candidate.name.trim()}`;
}

/** The key back; undefined for anything malformed. */
export function parseCandidateKey(key: string): CandidateRef | undefined {
  const at = key.indexOf(':');
  if (at < 0) return undefined;
  const kind = key.slice(0, at);
  const rest = key.slice(at + 1);
  if ((kind === 'application' || kind === 'form') && UUID.test(rest)) return { kind, id: rest };
  if (kind === 'name' && rest.trim() && rest.length <= 150) return { kind: 'manual', name: rest.trim() };
  return undefined;
}
