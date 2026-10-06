#!/usr/bin/env node
/**
 * Every database script, run against a database you named out loud.
 *
 *   node scripts/db.mjs dev    <task> [args]   .env.development.local — must be local
 *   node scripts/db.mjs prod   <task> [args]   .env.local — must NOT be local; asks first
 *   node scripts/db.mjs deploy <task> [args]   the host's own environment — Render / CI only
 *
 * The package.json scripts are the way in (db:dev:migrate, db:prod:migrate,
 * db:migrate:deploy, …); this is what they call. The target is the first word,
 * the env file follows from it, and the file is checked against it — a dev
 * file that points at Supabase is refused rather than obeyed.
 *
 * Destructive tasks (seed, clear) are never offered against production.
 * Same runner as shd_onelink.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { describeTarget, targetLabel } from './db-target.mjs';

const TS = ['--import', './scripts/register-alias.mjs'];
const DRIZZLE = 'node_modules/drizzle-kit/bin.cjs';

/** What each task runs, after `node`. */
const TASKS = {
  migrate: [DRIZZLE, 'migrate'],
  'generate:custom': [DRIZZLE, 'generate', '--custom'],
  studio: [DRIZZLE, 'studio'],
  seed: [...TS, 'scripts/seed.ts'],
  'import-legacy': [...TS, 'scripts/import-legacy.ts'],
};

/** Where each target's connection comes from, and what it may run. */
const TARGETS = {
  dev: { file: '.env.development.local', tasks: Object.keys(TASKS) },
  prod: { file: '.env.local', tasks: ['migrate', 'import-legacy'] },
  deploy: { file: null, tasks: ['migrate'] },
};

const red = (text) => (process.stdout.isTTY ? `\x1b[1;31m${text}\x1b[0m` : text);
const green = (text) => (process.stdout.isTTY ? `\x1b[32m${text}\x1b[0m` : text);

function fail(message) {
  console.error(red('✖ ') + message);
  process.exit(1);
}

const [targetName, task, ...args] = process.argv.slice(2);
const target = TARGETS[targetName];
if (!target) fail(`Say which database: dev, prod or deploy. Got "${targetName ?? ''}".`);
if (!task || !TASKS[task]) fail(`Unknown task "${task ?? ''}". Tasks: ${Object.keys(TASKS).join(', ')}.`);
if (!target.tasks.includes(task)) {
  fail(`"${task}" is not offered against ${targetName}. Against ${targetName}: ${target.tasks.join(', ')}.`);
}

// Only where nobody is at a keyboard to be asked: the deploy host or CI.
if (targetName === 'deploy' && !process.env.RENDER && !process.env.CI) {
  fail('db:migrate:deploy is for the deploy host (Render) or CI. From a laptop, use npm run db:prod:migrate.');
}

// The connection comes from the target's file and nowhere else: whatever the
// shell happens to have exported must not leak through.
if (target.file) {
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;
  delete process.env.SHD_ALLOW_PRODUCTION;
  if (!existsSync(target.file)) {
    fail(
      targetName === 'dev'
        ? `${target.file} is missing. Copy .env.development.example to ${target.file} (and start the database: npm run db:dev:up).`
        : `${target.file} is missing. Copy .env.example to ${target.file} and fill in the production values.`,
    );
  }
  process.loadEnvFile(target.file);
}

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) fail(`Neither DIRECT_URL nor DATABASE_URL is set${target.file ? ` in ${target.file}` : ''}.`);
const where = describeTarget(url);

if (targetName === 'dev') {
  if (!where.local) {
    fail(
      `${target.file} points at ${targetLabel(where)}, which is not on this machine. ` +
        'The dev scripts only run against a local database — check DIRECT_URL / DATABASE_URL there.',
    );
  }
  console.log(green(`→ development database ${targetLabel(where)}`));
} else {
  if (where.local) {
    fail(`${targetName} points at ${targetLabel(where)}, a local database. Use the db:dev:* scripts for that.`);
  }
  if (targetName !== 'deploy') {
    console.log(red('\n  ⚠  PRODUCTION'));
    console.log(red(`     ${task}${args.length ? ` ${args.join(' ')}` : ''} → ${targetLabel(where)}\n`));
    if (!process.stdin.isTTY) fail('Production needs a person at the keyboard to confirm. Run it in a terminal.');
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await prompt.question('Type "production" to go ahead: ');
    prompt.close();
    if (answer.trim() !== 'production') fail('Not confirmed. Nothing was run.');
  }
  console.log(red(`→ PRODUCTION database ${targetLabel(where)}`));
}

const child = spawn(process.execPath, [...TASKS[task], ...args], {
  stdio: 'inherit',
  env: { ...process.env, ...(where.local ? {} : { SHD_ALLOW_PRODUCTION: '1' }) },
});
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)));
