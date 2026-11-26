import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as applications from '@/app/api/v1/jobs/[code]/applications/route';
import { objectStore } from '@/lib/storage';
import { resetServerEnv } from '@/lib/env';
import { applicationForm, call } from '@/tests/support/api';
import { testClient } from '@/tests/support/db';
import { openJob } from '@/tests/support/fixtures';

const apply = (code: string, headers: Record<string, string> = {}) =>
  call(applications.POST, {
    params: { code },
    form: applicationForm(),
    headers,
    path: `/api/v1/jobs/${code}/applications`,
  });

/** The files under jobs/ in the test storage. */
const stored = () => {
  const root = path.join(process.env.LOCAL_STORAGE_DIR!, 'jobs');
  return existsSync(root)
    ? readdirSync(root, { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => e.name).length
    : 0;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetServerEnv();
});

describe('an application sent twice', () => {
  it('with its id: one row, one set of files, the same answer', async () => {
    const { job } = await openJob();
    const before = stored();
    const id = { 'x-submission-id': '0b0e7c52-6a0c-4f0e-9c55-1d7c6f1c2a12' };
    const [a, b] = await Promise.all([apply(job.code, id), apply(job.code, id)]);
    expect([a!.status, b!.status]).toEqual([201, 201]);
    expect(a!.body).toEqual(b!.body);
    expect(await testClient`select pk from applications`).toHaveLength(1);
    expect(await testClient`select pk from application_files`).toHaveLength(1);
    expect(stored()).toBe(before + 1);
  });
});

describe('a failed application leaves no file behind', () => {
  it('when the row cannot be saved', async () => {
    const { job } = await openJob();
    const before = stored();
    // The last insert of the transaction fails, after the files are in storage.
    await testClient`alter table application_files add constraint test_refuse check (size_bytes < 0) not valid`;
    try {
      expect((await apply(job.code)).status).toBe(500);
    } finally {
      await testClient`alter table application_files drop constraint test_refuse`;
    }
    expect(await testClient`select pk from applications`).toHaveLength(0);
    expect(stored()).toBe(before);
  });

  it('when the file was stored but the answer was lost', async () => {
    const { job } = await openJob();
    const before = stored();
    const objects = objectStore();
    const put = objects.put.bind(objects);
    vi.spyOn(objects, 'put').mockImplementation(async (...args) => {
      await put(...args);
      throw new Error('socket hang up');
    });
    expect((await apply(job.code)).status).toBe(500);
    expect(stored()).toBe(before);
  });
});

describe('Turnstile', () => {
  it('is asked before any of the body is read', async () => {
    const { job } = await openJob();
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'site');
    resetServerEnv();
    const verify = vi.fn(async () => Response.json({ success: true }));
    vi.stubGlobal('fetch', verify);
    let pulled = 0;
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          pulled++;
          controller.enqueue(new Uint8Array(1024));
        },
      },
      { highWaterMark: 0 },
    );
    const send = (code: string) =>
      applications.POST(
        new Request(`http://localhost/api/v1/jobs/${code}/applications`, {
          method: 'POST',
          body,
          duplex: 'half',
          headers: { 'content-type': 'multipart/form-data; boundary=x' },
        } as RequestInit),
        { params: Promise.resolve({ code }) },
      );
    expect((await send(job.code)).status).toBe(400);
    expect((await send('NOPE-1')).status).toBe(404);
    expect(pulled).toBe(0);
    expect(verify).not.toHaveBeenCalled();
    expect((await apply(job.code, { 'x-turnstile-token': 'ok' })).status).toBe(201);
    expect(verify).toHaveBeenCalledOnce();
  });
});
