import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAnnouncementForm } from "@/components/admin/admin-announcement-form";
import { getAnnouncementByIdForAdmin } from "@/server/queries/announcements";
import { listPropertiesForSelect } from "@/server/queries/admin-entities";

type Props = { params: { id: string } };

export default async function AdminEditAnnouncementPage({ params }: Props) {
  const [row, properties] = await Promise.all([
    getAnnouncementByIdForAdmin(params.id),
    listPropertiesForSelect()
  ]);

  if (!row) {
    notFound();
  }

  const opts = properties.map((p) => ({ id: p.id, label: `${p.code} · ${p.name}` }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/announcements" className="text-primary hover:underline">
          ← Announcements
        </Link>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">Edit announcement</h1>
      <AdminAnnouncementForm
        announcementId={row.id}
        properties={opts}
        initial={{
          title: row.title,
          body: row.body,
          audienceType: row.audienceType,
          propertyId: row.propertyId ?? opts[0]?.id ?? "",
          isPublished: row.isPublished,
          publishedAt: row.publishedAt?.toISOString() ?? ""
        }}
      />
    </div>
  );
}
