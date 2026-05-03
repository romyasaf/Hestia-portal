"use server";

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { guardActionRoles } from "@/server/auth/action-guard";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type UnitListingUploadResult = { ok: true; url: string } | { ok: false; error: string };

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Stores an image under `public/uploads/units/{unitId}/` and returns a site-relative URL.
 * Admin-only; used for listing cover and gallery (not exposed to anonymous listing APIs beyond the URL on the unit row).
 */
export async function uploadUnitListingImage(formData: FormData): Promise<UnitListingUploadResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const unitIdRaw = formData.get("unitId");
  const file = formData.get("file");
  if (typeof unitIdRaw !== "string" || !UUID_RE.test(unitIdRaw.trim())) {
    return { ok: false, error: "invalid_unit" };
  }
  const unitId = unitIdRaw.trim();
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "missing_file" };
  }

  const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { id: true } });
  if (!unit) {
    return { ok: false, error: "invalid_unit" };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return { ok: false, error: "file_too_large" };
  }

  const mime = file.type;
  if (mime !== "image/jpeg" && mime !== "image/png" && mime !== "image/webp") {
    return { ok: false, error: "invalid_type" };
  }

  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const name = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const dir = join(process.cwd(), "public", "uploads", "units", unit.id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), buf);

  return { ok: true, url: `/uploads/units/${unit.id}/${name}` };
}
