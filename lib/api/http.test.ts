import { describe, expect, it } from 'vitest';
import { BadRequestError } from '@/lib/errors';
import { readBody } from './http';

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
