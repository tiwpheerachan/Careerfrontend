import { adminLocaleOf, type AdminLocale } from '@/lib/i18n/admin';

/**
 * What a refusal means, in the admin's language: the API's own messages are
 * English, and end up in toasts. Not in messages/: adminFetch is no hook. By
 * the API's error code; conflicts by their sentence (a 409 says what with).
 */
const TEXT: Record<AdminLocale, Record<string, string>> = {
  th: {
    network: 'ติดต่อเซิร์ฟเวอร์ไม่ได้ — ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง',
    unauthorized: 'หมดเวลาเข้าสู่ระบบ — เข้าสู่ระบบใหม่แล้วลองอีกครั้ง',
    forbidden: 'บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้',
    not_found: 'ไม่พบข้อมูลนี้ — อาจถูกลบไปแล้ว',
    too_many_requests: 'มีการทำรายการถี่เกินไป — รอสักครู่แล้วลองอีกครั้ง',
    unavailable: 'ระบบไม่พร้อมใช้งานชั่วคราว — รอสักครู่แล้วลองอีกครั้ง',
    internal: 'ระบบขัดข้อง — ลองอีกครั้ง',
    linked: 'ผู้สมัครคนนี้เชื่อมกับใบสมัครแล้ว',
    clash: 'มีผู้ประเมินครั้งและฝ่ายเดียวกันไว้ทั้งสองรายการ — ลบผลประเมินหนึ่งรายการก่อนแล้วค่อยเชื่อม',
  },
  en: {
    network: 'Could not reach the server — check your connection and try again',
    unauthorized: 'Your sign-in has expired — sign in again and retry',
    forbidden: 'This account may not do that',
    not_found: 'Not found — it may have been deleted',
    too_many_requests: 'Too many requests — wait a moment and try again',
    unavailable: 'Temporarily unavailable — wait a moment and try again',
    internal: 'Something went wrong — try again',
    linked: 'This candidate is already linked to an application or form',
    clash: 'Someone has evaluated the same round and side of both — delete one of the two evaluations, then link',
  },
  zh: {
    network: '无法连接服务器 — 请检查网络后重试',
    unauthorized: '登录已过期 — 请重新登录后再试',
    forbidden: '此账号无权执行该操作',
    not_found: '未找到该内容 — 可能已被删除',
    too_many_requests: '操作过于频繁 — 请稍候再试',
    unavailable: '服务暂时不可用 — 请稍候再试',
    internal: '系统出错 — 请重试',
    linked: '该应聘者已关联到应聘资料',
    clash: '有人已对两份资料的同一轮次和同一方做过评估 — 请先删除其中一份再关联',
  },
};

const CONFLICTS: Array<[RegExp, string]> = [
  [/^This candidate is already linked/, 'linked'],
  [/has evaluated the same round of both/, 'clash'],
];

const CODE_OF: Record<number, string> = {
  429: 'too_many_requests',
  502: 'unavailable',
  503: 'unavailable',
  504: 'unavailable',
};

/** The API's error in the page's language (<html lang>); its own message for anything not known here. */
export function apiMessage(code: string | undefined, message: string, status = 0): string {
  // No code: not the API's own error (a proxy in front of it, say).
  code ??= CODE_OF[status];
  const key = code === 'conflict' ? CONFLICTS.find(([sentence]) => sentence.test(message))?.[1] : code;
  const texts = TEXT[adminLocaleOf(typeof document === 'undefined' ? undefined : document.documentElement.lang)];
  return key && Object.hasOwn(texts, key) ? texts[key]! : message;
}

/** The evaluation a 409 names as already there (that message is kept as the API sent it), if any. */
export const twinOf = (message: string) => /evaluation ([0-9a-f-]{36})/.exec(message)?.[1];

/**
 * Calls /api/v1/admin/* from the admin's client components.
 *
 * Every mutation in the admin goes through the API (the same endpoints, the
 * same gate, the same validation the docs describe) and then refreshes the
 * server-rendered page. Errors come back as AdminApiError carrying the API's
 * `code`, field `issues`, and `message` in the admin's language where it is
 * known — shown in a toast or next to fields.
 */
export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues: Array<{ path: string; message: string }>;

  constructor(status: number, code: string, message: string, issues: Array<{ path: string; message: string }> = []) {
    super(apiMessage(code, message));
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

export async function adminFetch<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(`/api/v1/admin${path}`, {
      ...rest,
      headers: { ...(json !== undefined ? { 'content-type': 'application/json' } : {}), ...rest.headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      cache: 'no-store',
    });
  } catch {
    throw new AdminApiError(0, 'network', 'Could not reach the server.');
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body?.error ?? {};
    // No code: not the API's own error (a proxy in front of it, say).
    const code = error.code ?? CODE_OF[response.status] ?? 'error';
    throw new AdminApiError(response.status, code, error.message ?? response.statusText, error.issues);
  }
  return body as T;
}
