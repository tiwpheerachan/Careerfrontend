/**
 * Calls a route handler the way Next does: a Request, and `{ params }` as a
 * promise. No server, no network — the handler, the repositories and the
 * test database.
 */
type RouteHandler = (request: Request, route: { params: Promise<Record<string, string>> }) => Promise<Response>;

export async function call(
  route: RouteHandler,
  options: {
    method?: string;
    path?: string;
    query?: Record<string, string>;
    params?: Record<string, string>;
    json?: unknown;
    form?: FormData;
    headers?: Record<string, string>;
  } = {},
) {
  const url = new URL(`http://localhost${options.path ?? '/api/v1/test'}`);
  for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, value);
  const request = new Request(url, {
    method: options.method ?? (options.json || options.form ? 'POST' : 'GET'),
    headers: { ...(options.json ? { 'content-type': 'application/json' } : {}), ...options.headers },
    body: options.form ?? (options.json !== undefined ? JSON.stringify(options.json) : undefined),
  });
  const response = await route(request, { params: Promise.resolve(options.params ?? {}) });
  const type = response.headers.get('content-type') ?? '';
  // Decoded by hand so a byte-order mark is kept: Response.text() strips it,
  // and whether the CSV starts with one is something to test.
  const body = type.includes('json')
    ? await response.json()
    : new TextDecoder('utf-8', { ignoreBOM: true }).decode(await response.arrayBuffer());
  return { status: response.status, headers: response.headers, body };
}

/** The smallest bytes each type is recognised by (lib/files.ts sniff). */
export const FILES = {
  pdf: () => new File(['%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n'], 'ประวัติ resume.pdf', { type: 'application/pdf' }),
  png: () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])], 'photo.png'),
  /** An HTML page wearing a .pdf name and content type. */
  fakePdf: () => new File(['<html><script>alert(1)</script></html>'], 'cv.pdf', { type: 'application/pdf' }),
};

/** A complete, valid application form; override or delete fields per test. */
export function applicationForm(overrides: Record<string, string | File | null> = {}): FormData {
  const fields: Record<string, string | File> = {
    locale: 'th',
    firstName: 'Somchai',
    lastName: 'Jaidee',
    email: 'somchai@example.com',
    phone: '+66 81 234 5678',
    residenceCountry: 'Thailand',
    visaRequired: 'false',
    availableFrom: '2026-12-01',
    websiteUrl: 'https://example.com/me',
    sourceChannel: 'LinkedIn',
    termsAccepted: 'true',
    educations: JSON.stringify([
      { level: 'BACHELOR', institute: 'CU', program: 'Eng', startMonth: '2015-06', endMonth: '2019-05' },
    ]),
    experiences: JSON.stringify([{ company: 'Acme', role: 'Agent', startMonth: '2019-07', endMonth: null }]),
    skills: JSON.stringify(['Excel', 'excel', 'Customer Service']),
    resume: FILES.pdf(),
  };
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...fields, ...overrides })) {
    if (value !== null) form.append(key, value as string | Blob);
  }
  return form;
}
