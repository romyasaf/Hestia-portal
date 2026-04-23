import { prisma } from "@/lib/prisma";
import { getActiveLeaseForTenant } from "@/server/queries/leases";

export type AnnouncementListRow = {
  id: string;
  title: string;
  audienceType: string;
  isPublished: boolean;
  publishedAt: string | null;
  updatedAt: string;
};

export async function listAnnouncementsForAdmin(): Promise<AnnouncementListRow[]> {
  const rows = await prisma.announcement.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      audienceType: true,
      isPublished: true,
      publishedAt: true,
      updatedAt: true
    }
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    audienceType: r.audienceType,
    isPublished: r.isPublished,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    updatedAt: r.updatedAt.toISOString()
  }));
}

export type TenantAnnouncementRow = {
  id: string;
  title: string;
  body: string;
  publishedAt: string | null;
};

export async function listAnnouncementsForTenantUser(userId: string): Promise<TenantAnnouncementRow[]> {
  const lease = await getActiveLeaseForTenant(userId);
  const now = new Date();

  const audienceOr = lease
    ? [
        { audienceType: "all" },
        { audienceType: "tenants" },
        { AND: [{ audienceType: "building" }, { propertyId: lease.building.id }] }
      ]
    : [{ audienceType: "all" }, { audienceType: "tenants" }];

  const rows = await prisma.announcement.findMany({
    where: {
      isPublished: true,
      AND: [
        {
          OR: [{ publishedAt: null }, { publishedAt: { lte: now } }]
        },
        {
          OR: audienceOr
        }
      ]
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 50,
    select: {
      id: true,
      title: true,
      body: true,
      publishedAt: true
    }
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    publishedAt: r.publishedAt?.toISOString() ?? null
  }));
}

export async function getAnnouncementByIdForAdmin(id: string) {
  return prisma.announcement.findUnique({ where: { id } });
}

/** Staff: global + internal + tenant-facing. Building-scoped posts are not shown (no implicit access to every property). */
export async function listAnnouncementsForStaffUser(): Promise<TenantAnnouncementRow[]> {
  const now = new Date();
  const rows = await prisma.announcement.findMany({
    where: {
      isPublished: true,
      AND: [
        { OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] },
        {
          OR: [{ audienceType: "all" }, { audienceType: "staff" }, { audienceType: "tenants" }]
        }
      ]
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 50,
    select: { id: true, title: true, body: true, publishedAt: true }
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    publishedAt: r.publishedAt?.toISOString() ?? null
  }));
}

/** Owners: posts for owners plus building-scoped items on buildings they can see (building-level or direct unit). */
export async function listAnnouncementsForOwnerUser(userId: string): Promise<TenantAnnouncementRow[]> {
  const [buildingOwned, unitOwned] = await Promise.all([
    prisma.property.findMany({
      where: { ownerUserId: userId },
      select: { id: true }
    }),
    prisma.unit.findMany({
      where: { ownerUserId: userId },
      select: { propertyId: true }
    })
  ]);
  const idSet = new Set<string>();
  for (const p of buildingOwned) {
    idSet.add(p.id);
  }
  for (const u of unitOwned) {
    idSet.add(u.propertyId);
  }
  const ids = [...idSet];
  if (ids.length === 0) {
    return [];
  }
  const now = new Date();
  const rows = await prisma.announcement.findMany({
    where: {
      isPublished: true,
      AND: [
        { OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] },
        {
          OR: [
            { audienceType: "all" },
            { audienceType: "owners" },
            { AND: [{ audienceType: "building" }, { propertyId: { in: ids } }] }
          ]
        }
      ]
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 50,
    select: { id: true, title: true, body: true, publishedAt: true }
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    publishedAt: r.publishedAt?.toISOString() ?? null
  }));
}
