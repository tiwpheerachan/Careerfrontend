/** Types for db-target.mjs, which the .ts scripts, drizzle.config.ts and lib/db/client.ts import. */
export interface Target {
  host: string;
  port: string;
  database: string;
  local: boolean;
}
export function describeTarget(url: string): Target;
export function targetLabel(target: Target): string;
export function productionAllowed(): boolean;
export function assertMayTouch(url: string, task: string): Target;
