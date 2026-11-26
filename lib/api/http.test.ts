import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { BadRequestError } from '@/lib/errors';
import { handler, json, parseBody, readBody, readFormData } from './http';

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
    const upload = (request: Request) =>
      readFormData(request, 61 * MB, 'too large', 'invalid').catch((e) => {
        if (e.name !== 'BadRequestError') throw e;
      });
    const slow = handler(async (request) => {
      await upload(request);
      read();
      await answered;
      return json({});
    });
    const quick = handler(async (request) => {
      await upload(request);
      return json({});
    });
    const saving = handler(async (request) => json(await parseBody(request, z.object({ a: z.number() }))));

    const first = slow(big(), undefined);
    await isRead;
    const refused = await quick(big(), undefined);
    expect(refused.status).toBe(503);
    expect(refused.headers.get('retry-after')).toBeTruthy();
    expect((await quick(chunked(5, MB), undefined)).status).toBe(200);
    // Uploads only: everyone else keeps saving.
    const stage = new Request('http://test/x', { method: 'POST', body: '{"a":1}' });
    expect((await saving(stage, undefined)).status).toBe(200);
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

describe('an upload left half sent', () => {
  afterEach(() => void vi.useRealTimers());

  it('is dropped, and gives its share back', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const body = new ReadableStream<Uint8Array>({
      start: (controller) => controller.enqueue(new Uint8Array(39 * 1024 * 1024)),
    });
    const request = new Request('http://test/x', { method: 'POST', body, duplex: 'half' } as RequestInit);
    const upload = handler(async (r) => {
      await readFormData(r, 61 * 1024 * 1024, 'too large', 'invalid');
      return json({});
    });
    const stuck = upload(request, undefined);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await vi.advanceTimersByTimeAsync(31_000);
    const answer = await stuck;
    expect(answer.status).toBe(400);
    expect(await answer.text()).toContain('too long');
    expect((await upload(chunked(30, 1024 * 1024), undefined)).status).toBe(400); // not multipart — but not 503
  });
});

describe('a change from another site', () => {
  const change = handler(async () => json({}));
  const from = (site: string | null, path = '/api/v1/admin/jobs') =>
    change(
      new Request(`http://test${path}`, { method: 'POST', headers: site ? { 'sec-fetch-site': site } : {} }),
      undefined,
    );

  it('is refused on the admin and evaluations; the public forms are not affected', async () => {
    expect((await from('cross-site')).status).toBe(403);
    expect((await from('same-site', '/api/v1/evaluate/t')).status).toBe(403);
    expect((await from('same-origin')).status).toBe(200);
    expect((await from(null)).status).toBe(200);
    expect((await from('cross-site', '/api/v1/application-forms')).status).toBe(200);
  });
});
