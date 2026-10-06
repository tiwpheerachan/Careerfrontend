import { serverEnv } from '@/lib/env';

/**
 * The visitor's IP, for the per-IP rate limit. Used transiently and never
 * stored with an application.
 *
 * Read from the header the deployment names (TRUST_PROXY_HEADER), counting
 * TRUST_PROXY_HOPS entries from the RIGHT of a comma list. Counting from the
 * right is what makes it unspoofable: a visitor who sends their own
 * X-Forwarded-For only adds entries to the left of the ones our proxies append.
 *
 * In development there is no proxy: everyone is "local".
 */
export function clientIp(request: Request): string | undefined {
  const env = serverEnv();
  if (env.NODE_ENV !== 'production' && !env.TRUST_PROXY_HEADER) return 'local';
  if (!env.TRUST_PROXY_HEADER) return undefined;

  const raw = request.headers.get(env.TRUST_PROXY_HEADER);
  if (!raw) return undefined;
  const entries = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const ip = entries[entries.length - env.TRUST_PROXY_HOPS];
  return ip && /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : undefined;
}
