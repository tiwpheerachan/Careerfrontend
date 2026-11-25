import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@/lib/errors';
import { createSupabaseStore } from './supabase';

const store = createSupabaseStore({ origin: 'http://storage.test', key: 'k', bucket: 'b' });
afterEach(() => vi.unstubAllGlobals());

describe('opening a stored file', () => {
  it('hands on the body as a stream, with its length', async () => {
    const response = new Response('%PDF-', { headers: { 'content-length': '5' } });
    vi.stubGlobal('fetch', async () => response);
    const { body, size } = await store.open('forms/x/resume-0.pdf');
    expect(body).toBe(response.body);
    expect(response.bodyUsed).toBe(false);
    expect(size).toBe(5);
  });

  it('gives no length for an encoded body, and NotFoundError when it is gone', async () => {
    vi.stubGlobal(
      'fetch',
      async () => new Response('x', { headers: { 'content-length': '1', 'content-encoding': 'br' } }),
    );
    expect((await store.open('x')).size).toBeNull();
    vi.stubGlobal('fetch', async () => new Response('', { status: 404 }));
    await expect(store.open('x')).rejects.toBeInstanceOf(NotFoundError);
  });
});
