"use server";

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { assertUserHasOwnerRole } from "@/server/actions/admin-entities";
import { guardActionRoles } from "@/server/auth/action-guard";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BYTES = 12 * 1024 * 1024;

export type OwnerProfileUploadResult = { ok: true; url: string } | { ok: false; error: string };

/** `kind`: qid_photo | cr_document */
export async function uploadOwnerProfileDocument(formData: FormData): Promise<OwnerProfileUploadResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const ownerUserIdRaw = formData.get("ownerUserId");
  const kindRaw = formData.get("kind");
  const file = formData.get("file");
  if (typeof ownerUserIdRaw !== "string" || !UUID_RE.test(ownerUserIdRaw.trim())) {
    return { ok: false, error: "invalid_owner" };
  }
  const kind = typeof kindRaw === "string" ? kindRaw.trim().toLowerCase() : "";
  if (kind !== "qid_photo" && kind !== "cr_document") {
    return { ok: false, error: "invalid_kind" };
  }
  const ownerUserId = ownerUserIdRaw.trim();
  const okOwner = await assertUserHasOwnerRole(ownerUserId);
  if (!okOwner) {
    return { ok: false, error: "invalid_owner" };
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
  const name = `${kind}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const dir = join(process.cwd(), "public", "uploads", "owner-profiles", ownerUserId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), buf);

  return { ok: true, url: `/uploads/owner-profiles/${ownerUserId}/${name}` };
}
