import Link from "next/link";
import { AdminAnnouncementForm } from "@/components/admin/admin-announcement-form";
import { listPropertiesForSelect } from "@/server/queries/admin-entities";

export default async function AdminNewAnnouncementPage() {
  const properties = await listPropertiesForSelect();
  const opts = properties.map((p) => ({ id: p.id, label: `${p.code} · ${p.name}` }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/announcements" className="text-primary hover:underline">
          ← Announcements
        </Link>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">New announcement</h1>
      <AdminAnnouncementForm properties={opts} />
    </div>
  );
}
