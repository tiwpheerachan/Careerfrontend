/**
 * POST /api/v1/jobs/{code}/applications with XMLHttpRequest — fetch cannot
 * report upload progress. Resolves with what the server said; never throws.
 */

export interface Issue {
  path: string;
  message: string;
}

export type SubmitOutcome =
  | { kind: 'created'; id: string }
  | { kind: 'invalid'; message: string; issues: Issue[] }
  | { kind: 'notFound' }
  | { kind: 'rateLimited'; retryAfterSeconds: number }
  | { kind: 'unavailable' }
  | { kind: 'failed'; message?: string }
  | { kind: 'network' };

interface ErrorBody {
  error?: { code?: string; message?: string; issues?: Issue[] };
}

export function sendApplication(
  code: string,
  body: FormData,
  handlers: { onProgress: (percent: number) => void; onUploaded: () => void },
): Promise<SubmitOutcome> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/v1/jobs/${encodeURIComponent(code)}/applications`);
    xhr.responseType = 'text';
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) handlers.onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.upload.onload = () => {
      handlers.onProgress(100);
      handlers.onUploaded();
    };

    xhr.onerror = () => resolve({ kind: 'network' });
    xhr.ontimeout = () => resolve({ kind: 'network' });
    xhr.onload = () => {
      let json: unknown = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        // not JSON (a proxy error page): handled by status below
      }
      const err = (json as ErrorBody | null)?.error;

      if (xhr.status === 201) {
        const id = (json as { id?: string } | null)?.id;
        return resolve(id ? { kind: 'created', id } : { kind: 'failed' });
      }
      if (xhr.status === 400) {
        return resolve({ kind: 'invalid', message: err?.message ?? '', issues: err?.issues ?? [] });
      }
      if (xhr.status === 404) return resolve({ kind: 'notFound' });
      if (xhr.status === 429) {
        const header = Number(xhr.getResponseHeader('Retry-After'));
        return resolve({
          kind: 'rateLimited',
          retryAfterSeconds: Number.isFinite(header) && header > 0 ? header : 600,
        });
      }
      if (xhr.status === 503) return resolve({ kind: 'unavailable' });
      resolve({ kind: 'failed', message: err?.message });
    };

    xhr.send(body);
  });
}
