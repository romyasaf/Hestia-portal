"use server";

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { guardActionRoles } from "@/server/auth/action-guard";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BYTES = 12 * 1024 * 1024;

export type TenantProfileUploadResult = { ok: true; url: string } | { ok: false; error: string };

/** `kind`: qid_photo | passport_photo | cr_document */
export async function uploadTenantProfileDocument(formData: FormData): Promise<TenantProfileUploadResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const tenantUserIdRaw = formData.get("tenantUserId");
  const kindRaw = formData.get("kind");
  const file = formData.get("file");
  if (typeof tenantUserIdRaw !== "string" || !UUID_RE.test(tenantUserIdRaw.trim())) {
    return { ok: false, error: "invalid_tenant" };
  }
  const kind = typeof kindRaw === "string" ? kindRaw.trim().toLowerCase() : "";
  if (kind !== "qid_photo" && kind !== "passport_photo" && kind !== "cr_document") {
    return { ok: false, error: "invalid_kind" };
  }
  const tenantUserId = tenantUserIdRaw.trim();

  const tenant = await prisma.user.findFirst({
    where: { id: tenantUserId, userRoles: { some: { role: { code: "tenant" } } } },
    select: { id: true }
  });
  if (!tenant) {
    return { ok: false, error: "invalid_tenant" };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "missing_file" };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return { ok: false, error: "file_too_large" };
  }

  const mime = file.type;
  const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(mime)) {
    return { ok: false, error: "invalid_type" };
  }

  const ext =
    mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const name = `${kind.replace(/_/g, "-")}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const dir = join(process.cwd(), "public", "uploads", "tenant-profiles", tenantUserId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), buf);

  return { ok: true, url: `/uploads/tenant-profiles/${tenantUserId}/${name}` };
}
