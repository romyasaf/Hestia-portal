import Link from "next/link";
import { listLeadInquiriesForAdmin } from "@/server/queries/lead-inquiries";
import { leadInquiryTypeLabel } from "@/lib/inquiries/constants";
import type { LeadInquiryStatus, LeadInquiryType } from "@/lib/inquiries/constants";
import { AdminConvertTenantLeadForm } from "@/components/admin/admin-convert-tenant-lead-form";
import { AdminInquiryStatusForm } from "@/components/admin/admin-inquiry-status-form";

function parseFilter<T extends string>(value: string | string[] | undefined, allowed: readonly T[]): T | "all" {
  const v = typeof value === "string" ? value : "";
  if (!v || v === "all") {
    return "all";
  }
  return (allowed as readonly string[]).includes(v) ? (v as T) : "all";
}

const TYPES: LeadInquiryType[] = ["owner", "tenant", "contracting"];
const STATUSES: LeadInquiryStatus[] = ["new", "in_progress", "closed"];

type Props = { searchParams: Record<string, string | string[] | undefined> };

export default async function AdminInquiriesPage({ searchParams }: Props) {
  const typeFilter = parseFilter(searchParams.type, TYPES);
  const statusFilter = parseFilter(searchParams.status, STATUSES);
  let rows: Awaited<ReturnType<typeof listLeadInquiriesForAdmin>> = [];
  let loadError: string | null = null;
  try {
    rows = await listLeadInquiriesForAdmin({
      type: typeFilter,
      status: statusFilter,
      take: 200
    });
  } catch {
    loadError =
      "Could not load inquiries. Ensure database migration 009 (lead_inquiries) has been applied, then try again.";
  }

  const qs = (t: LeadInquiryType | "all", s: LeadInquiryStatus | "all") => {
    const p = new URLSearchParams();
    if (t !== "all") {
      p.set("type", t);
    }
    if (s !== "all") {
      p.set("status", s);
    }
    const q = p.toString();
    return q ? `?${q}` : "";
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Inquiries</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Lead inbox</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Owner, tenant, and contracting leads from the public site. Use type and status filters — full lists stay off
          the dashboard.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="text-muted-foreground">Type:</span>
        <Link
          href={`/admin/inquiries${qs("all", statusFilter)}`}
          className={typeFilter === "all" ? "font-semibold text-foreground" : "text-primary hover:underline"}
        >
          All
        </Link>
        {TYPES.map((t) => (
          <Link
            key={t}
            href={`/admin/inquiries${qs(t, statusFilter)}`}
            className={typeFilter === t ? "font-semibold text-foreground" : "text-primary hover:underline"}
          >
            {leadInquiryTypeLabel(t)}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="text-muted-foreground">Status:</span>
        <Link
          href={`/admin/inquiries${qs(typeFilter, "all")}`}
          className={statusFilter === "all" ? "font-semibold text-foreground" : "text-primary hover:underline"}
        >
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/inquiries${qs(typeFilter, s)}`}
            className={statusFilter === s ? "font-semibold text-foreground" : "text-primary hover:underline"}
          >
            {s.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      {loadError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      {!loadError && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No inquiries match these filters.</p>
      ) : !loadError ? (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {r.fullName}{" "}
                    <span className="text-sm font-normal text-muted-foreground">· {r.email}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {leadInquiryTypeLabel(r.inquiryType)} · {r.phone} · {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <AdminInquiryStatusForm id={r.id} currentStatus={r.status} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm">{r.message}</p>
              {r.inquiryType === "tenant" && !r.convertedTenantUserId ? (
                <AdminConvertTenantLeadForm leadId={r.id} />
              ) : r.convertedTenantUserId ? (
                <p className="mt-3 text-xs text-muted-foreground">Converted to tenant user · {r.convertedAt}</p>
              ) : null}
              {r.context && Object.keys(r.context).length > 0 ? (
                <dl className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  {Object.entries(r.context).map(([k, v]) => (
                    <div key={k}>
                      <dt className="font-medium text-foreground">{k}</dt>
                      <dd>{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
