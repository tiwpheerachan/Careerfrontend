import { describe, expect, it } from 'vitest';
import { BadRequestError } from '@/lib/errors';
import { handler, json, readBody, readFormData } from './http';

/** A POST whose body arrives in chunks and has no content-length — what a chunked upload looks like. */
function chunked(chunks: number, size: number): Request {
  let sent = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent++ === chunks) controller.close();
      else controller.enqueue(new Uint8Array(size));
    },
  });
  return new Request('http://test/x', { method: 'POST', body, duplex: 'half' } as RequestInit);
}

describe('readBody', () => {
  it('returns a body under the limit', async () => {
    expect((await readBody(chunked(3, 100), 1000)).byteLength).toBe(300);
  });

  it('refuses a chunked body once it passes the limit, without reading the rest', async () => {
    await expect(readBody(chunked(1_000_000, 64 * 1024), 1024 * 1024)).rejects.toBeInstanceOf(BadRequestError);
  });

  it('refuses by content-length before reading anything', async () => {
    const request = new Request('http://test/x', {
      method: 'POST',
      body: 'x',
      headers: { 'content-length': String(10 * 1024 * 1024) },
    });
    await expect(readBody(request, 1024)).rejects.toBeInstanceOf(BadRequestError);
  });
});

describe('uploads held at the same time', () => {
  const MB = 1024 * 1024;
  const big = () => chunked(30, MB);

  it('a second large body is refused while the first is held, and taken once it is answered', async () => {
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    let read!: () => void;
    const isRead = new Promise<void>((resolve) => (read = resolve));
    const slow = handler(async (request) => {
      await readBody(request, 61 * MB);
      read();
      await answered;
      return json({});
    });
    const quick = handler(async (request) => json({ bytes: (await readBody(request, 61 * MB)).byteLength }));

    const first = slow(big(), undefined);
    await isRead;
    expect((await quick(big(), undefined)).status).toBe(503);
    expect((await quick(chunked(5, MB), undefined)).status).toBe(200);
    answer();
    expect((await first).status).toBe(200);
    expect((await quick(big(), undefined)).status).toBe(200);
  });

  it('one body alone may pass the shared budget, up to its own limit', async () => {
    const one = handler(async (request) => json({ bytes: (await readBody(request, 61 * MB)).byteLength }));
    expect((await one(chunked(60, MB), undefined)).status).toBe(200);
    expect((await one(chunked(62, MB), undefined)).status).toBe(400);
    expect((await one(chunked(60, MB), undefined)).status).toBe(200);
  });

  it('a multipart body keeps the reason it was refused', async () => {
    const request = chunked(3, MB);
    await expect(readFormData(request, MB, 'too large', 'invalid')).rejects.toThrow('too large');
  });
});
