'use strict';

/**
 * Cross-platform setup script (works on Windows cmd/PowerShell and on POSIX shells).
 * Mirrors the `setup` npm script but uses shell-agnostic command chaining so that
 * failures abort the run instead of continuing.
 *
 * Usage: npm run setup:shell
 */

const { spawnSync } = require('node:child_process');

const steps = [
  ['Installing dependencies', 'npm', ['install']],
  ['Starting docker services', 'docker', ['compose', 'up', '-d']],
  ['Generating Prisma client', 'npx', ['prisma', 'generate']],
  ['Applying database migrations', 'npx', ['prisma', 'migrate', 'deploy']],
  ['Seeding the database', 'npx', ['prisma', 'db', 'seed']],
];

function run(label, file, args) {
  process.stdout.write(`\n=== ${label} ===\n`);
  const result = spawnSync(file, args, { stdio: 'inherit', shell: true });
  if (result.error) {
    process.stderr.write(`\n[setup] Failed to run "${file}": ${result.error.message}\n`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.stderr.write(`\n[setup] STEP FAILED (exit ${result.status}): ${label}\n`);
    process.exit(result.status);
  }
}

for (const [label, file, args] of steps) {
  run(label, file, args);
}

process.stdout.write('\n[setup] Finished. Start the stack with: npm run dev\n');