import type { ApplicationFileKind } from '@/lib/db/schema';

/**
 * What an applicant may upload, and how a file's type is decided: from its
 * first bytes, never from its name or the content type the browser claims.
 * A "cv.pdf" that is really an HTML page is refused.
 */

export type FileType = 'pdf' | 'doc' | 'docx' | 'jpg' | 'png';

export const CONTENT_TYPES: Record<FileType, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  png: 'image/png',
};

const MB = 1024 * 1024;

export const FILE_RULES = {
  RESUME: { types: ['pdf', 'doc', 'docx'] as FileType[], maxBytes: 5 * MB, maxCount: 1 },
  TRANSCRIPT: { types: ['pdf', 'doc', 'docx'] as FileType[], maxBytes: 5 * MB, maxCount: 1 },
  ATTACHMENT: { types: ['pdf', 'doc', 'docx', 'jpg', 'png'] as FileType[], maxBytes: 10 * MB, maxCount: 5 },
} satisfies Record<ApplicationFileKind, { types: FileType[]; maxBytes: number; maxCount: number }>;

/** The largest request an application can legitimately be, with room for the form fields. */
export const MAX_APPLICATION_BYTES =
  FILE_RULES.RESUME.maxBytes + FILE_RULES.TRANSCRIPT.maxBytes + FILE_RULES.ATTACHMENT.maxBytes * 5 + 1 * MB;

const startsWith = (bytes: Uint8Array, signature: number[]) => signature.every((b, i) => bytes[i] === b);

/** The type the bytes say they are, or undefined for anything not on the list. */
export function sniff(bytes: Uint8Array): FileType | undefined {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf'; // %PDF-
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpg';
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'doc'; // OLE2 (Word 97–2003)
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    // A zip. A .docx is one whose entries include word/ — zip entry names are
    // stored as plain text, so it is enough to look for it.
    const head = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 64 * 1024)));
    if (head.includes('word/')) return 'docx';
  }
  return undefined;
}

/** A file name safe to show and to offer as a download name: no paths, no control characters, ≤ 150 chars. */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file';
  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>|]/g, '').trim();
  return (cleaned || 'file').slice(-150);
}
