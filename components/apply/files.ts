import { FILE_RULES, sniff } from '@/lib/files';

export type UploadKind = 'RESUME' | 'ATTACHMENT';

/** What the server will say about a file, decided the same way: size first, then the type read from its bytes. */
export async function checkFile(file: File, kind: UploadKind): Promise<'size' | 'type' | null> {
  const rule = FILE_RULES[kind];
  if (file.size > rule.maxBytes) return 'size';
  // sniff() looks at the first bytes (a .docx: its zip entry names, within 64 KB).
  const head = new Uint8Array(await file.slice(0, 64 * 1024).arrayBuffer());
  const type = sniff(head);
  return type && rule.types.includes(type) ? null : 'type';
}

export const fileKey = (f: File) => `${f.name}__${f.size}__${f.lastModified}`;

/** The `accept` attribute for a kind: its extensions (the server decides by content, this only filters the picker). */
export const acceptOf = (kind: UploadKind) =>
  FILE_RULES[kind].types.flatMap((t) => (t === 'jpg' ? ['.jpg', '.jpeg'] : [`.${t}`])).join(',');

export const MAX_ATTACHMENTS = FILE_RULES.ATTACHMENT.maxCount;
