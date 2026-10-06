import type { PublicJob } from '@/lib/repositories/jobs';

const norm = (v: string | null | undefined) => (v ?? '').trim().toLowerCase();

/**
 * Up to `limit` other jobs like this one — the old JobDetailPage's scoring:
 * same country 40, same department 30, same level 10, overlapping location 5.
 * Ties keep the list's order (newest first).
 */
export function recommendJobs(job: PublicJob, all: PublicJob[], limit = 8): PublicJob[] {
  const country = norm(job.countryCode);
  const dept = norm(job.department);
  const level = norm(job.level);
  const loc = norm(job.location);

  return all
    .filter((x) => x.code !== job.code)
    .map((x) => {
      let score = 0;
      const c = norm(x.countryCode);
      const d = norm(x.department);
      const l = norm(x.level);
      const xl = norm(x.location);
      if (c && country && c === country) score += 40;
      if (d && dept && d === dept) score += 30;
      if (l && level && l === level) score += 10;
      if (loc && xl && (loc.includes(xl) || xl.includes(loc))) score += 5;
      return { x, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.x);
}
