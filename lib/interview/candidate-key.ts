/**
 * Which evaluations belong to the same person: the same application, the same
 * application form, the same candidate HR added before either existed
 * (migration 0013) — or, for evaluations typed in by hand before candidates
 * were picked from the system, the same name (trimmed, case-insensitive).
 * One string, for urls and the PDF query.
 *
 *   application:<uuid>   form:<uuid>   pending:<uuid>   name:<the name>
 */
export type CandidateKind = 'application' | 'form' | 'pending';

export type CandidateRef = { kind: CandidateKind; id: string } | { kind: 'manual'; name: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS: readonly string[] = ['application', 'form', 'pending'] satisfies CandidateKind[];

export function candidateKey(candidate: { kind: CandidateKind | 'manual'; id: string | null; name: string }): string {
  if (candidate.kind !== 'manual' && candidate.id) return `${candidate.kind}:${candidate.id}`;
  return `name:${candidate.name.trim()}`;
}

/** The key back; undefined for anything malformed. */
export function parseCandidateKey(key: string): CandidateRef | undefined {
  const at = key.indexOf(':');
  if (at < 0) return undefined;
  const kind = key.slice(0, at);
  const rest = key.slice(at + 1);
  if (KINDS.includes(kind) && UUID.test(rest)) return { kind: kind as CandidateKind, id: rest };
  if (kind === 'name' && rest.trim() && rest.length <= 150) return { kind: 'manual', name: rest.trim() };
  return undefined;
}
