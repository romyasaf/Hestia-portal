/**
 * Runs `prisma` with the same env Next uses: loads `apps/web/.env.local` first
 * (Prisma CLI only reads `.env` by default).
 */
import { spawnSync } from "node:child_process";
import "./load-env-local";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: tsx scripts/run-prisma-with-env.ts <prisma args...>");
  process.exit(1);
}

const result = spawnSync("pnpm", ["exec", "prisma", ...args], {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
  shell: false
});

process.exit(result.status === null ? 1 : result.status);
