/**
 * Runs once per server process (Next `dev` / `start`).
 * Production: validates required env vars.
 *
 * **Do not import Prisma here.** Next bundles `instrumentation` in a context where Prisma can resolve
 * the Edge WASM client and throw (`PrismaClientValidationError` / "run Prisma Client on edge runtime"),
 * which breaks the whole app with 500s including `/login`. Table checks belong in CI / deploy scripts:
 * `pnpm --filter @hestia/web db:validate` (see `db/MIGRATIONS.md`).
 */
export async function register() {
  try {
    const { validateProductionEnvOrThrow } = await import("@/server/env/validate-production-env");
    validateProductionEnvOrThrow();
  } catch (err) {
    // eslint-disable-next-line no-console -- startup diagnostics
    console.error("[instrumentation] failed:", err);
    if (process.env.NODE_ENV === "production") {
      throw err;
    }
  }
}
