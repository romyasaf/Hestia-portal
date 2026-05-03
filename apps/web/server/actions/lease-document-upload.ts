"use server";

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardActionRoles } from "@/server/auth/action-guard";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BYTES = 15 * 1024 * 1024;

export type LeaseDocumentUploadResult = { ok: true; url: string } | { ok: false; error: string };

/** `kind`: unsigned_contract | signed_contract */
export async function uploadLeaseContractDocument(formData: FormData): Promise<LeaseDocumentUploadResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const leaseIdRaw = formData.get("leaseId");
  const kindRaw = formData.get("kind");
  const file = formData.get("file");
  if (typeof leaseIdRaw !== "string" || !UUID_RE.test(leaseIdRaw.trim())) {
    return { ok: false, error: "invalid_lease" };
  }
  const leaseId = leaseIdRaw.trim();
  const kind = typeof kindRaw === "string" ? kindRaw.trim().toLowerCase() : "";
  if (kind !== "unsigned_contract" && kind !== "signed_contract") {
    return { ok: false, error: "invalid_kind" };
  }

  const lease = await prisma.lease.findUnique({ where: { id: leaseId }, select: { id: true } });
  if (!lease) {
    return { ok: false, error: "invalid_lease" };
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
  const dir = join(process.cwd(), "public", "uploads", "leases", leaseId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), buf);

  const url = `/uploads/leases/${leaseId}/${name}`;
  await prisma.lease.update({
    where: { id: leaseId },
    data:
      kind === "unsigned_contract"
        ? { unsignedContractDocumentUrl: url }
        : { signedContractDocumentUrl: url }
  });

  revalidatePath("/admin/leases");
  revalidatePath(`/admin/leases/${leaseId}`);
  return { ok: true, url };
}
