"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { guardActionRoles } from "@/server/auth/action-guard";

export type AnnouncementActionResult = { ok: true } | { ok: false; error: string };

const AUDIENCES = new Set(["all", "tenants", "staff", "owners", "building"]);

export async function upsertAnnouncement(input: {
  id?: string;
  title: string;
  body: string;
  audienceType: string;
  propertyId?: string | null;
  isPublished: boolean;
  /** ISO string or empty = null */
  publishedAt?: string | null;
}): Promise<AnnouncementActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  const title = input.title?.trim();
  const body = input.body?.trim();
  if (!title || !body) {
    return { ok: false, error: "missing_fields" };
  }

  const aud = input.audienceType.trim().toLowerCase();
  if (!AUDIENCES.has(aud)) {
    return { ok: false, error: "invalid_audience" };
  }

  let publishedAt: Date | null = null;
  if (input.publishedAt?.trim()) {
    const d = new Date(input.publishedAt.trim());
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: "invalid_published_at" };
    }
    publishedAt = d;
  }

  const buildingPropertyId = aud === "building" ? input.propertyId?.trim() || null : null;
  if (aud === "building" && !buildingPropertyId) {
    return { ok: false, error: "building_requires_property" };
  }

  if (input.id?.trim()) {
    await prisma.announcement.update({
      where: { id: input.id.trim() },
      data: {
        title,
        body,
        audienceType: aud,
        propertyId: aud === "building" ? buildingPropertyId : null,
        isPublished: input.isPublished,
        publishedAt: input.isPublished ? publishedAt : null
      }
    });
  } else {
    await prisma.announcement.create({
      data: {
        title,
        body,
        audienceType: aud,
        propertyId: aud === "building" ? buildingPropertyId : null,
        isPublished: input.isPublished,
        publishedAt: input.isPublished ? publishedAt : null
      }
    });
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/tenant/announcements");
  revalidatePath("/staff/announcements");
  revalidatePath("/owner/announcements");
  return { ok: true };
}

export async function deleteAnnouncement(id: string): Promise<AnnouncementActionResult> {
  const guard = await guardActionRoles(["admin", "super_admin"]);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  await prisma.announcement.delete({ where: { id } });
  revalidatePath("/admin/announcements");
  revalidatePath("/tenant/announcements");
  revalidatePath("/staff/announcements");
  revalidatePath("/owner/announcements");
  return { ok: true };
}
