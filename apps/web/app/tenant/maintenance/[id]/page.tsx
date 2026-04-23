import Link from "next/link";
import { notFound } from "next/navigation";
import { MaintenanceAttachmentForm } from "@/components/maintenance/maintenance-attachment-form";
import { TicketAttachmentsList } from "@/components/maintenance/ticket-attachments-list";
import { TicketStatusControls } from "@/components/maintenance/ticket-status-controls";
import { listAllowedNextStatuses } from "@/lib/maintenance/statuses";
import { requireSession } from "@/server/auth/session";
import { canTenantReadTicket, getTicketById, toTicketDetail } from "@/server/queries/maintenance";

type Props = { params: { id: string } };

export default async function TenantMaintenanceDetailPage({ params }: Props) {
  const session = await requireSession();
  const ok = await canTenantReadTicket(session.user.id, params.id);
  if (!ok) {
    notFound();
  }

  const raw = await getTicketById(params.id);
  if (!raw) {
    notFound();
  }

  const ticket = toTicketDetail(raw);
  const nextStatuses = listAllowedNextStatuses(ticket.status, session.user.roles ?? []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <p className="text-sm">
        <Link href="/tenant/maintenance" className="text-primary hover:underline">
          ← Back to maintenance
        </Link>
      </p>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">{ticket.ticketNo}</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{ticket.status}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{ticket.title}</h1>
        <p className="text-sm text-muted-foreground">
          {ticket.category} · Priority {ticket.priority}
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-muted-foreground">Description</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{ticket.description || "—"}</p>
      </section>

      {(ticket.quoteDescription || ticket.quotedAmount) && (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-muted-foreground">Quote for your review</h2>
          {ticket.quotedAmount ? (
            <p className="mt-2 text-sm">
              <span className="font-medium">Amount:</span> {ticket.quotedAmount}
            </p>
          ) : null}
          {ticket.quoteDescription ? (
            <p className="mt-2 whitespace-pre-wrap text-sm">{ticket.quoteDescription}</p>
          ) : null}
        </section>
      )}

      <dl className="grid gap-4 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-2 sm:p-6">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Opened by</dt>
          <dd className="mt-1">{ticket.openedByName}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Assigned to</dt>
          <dd className="mt-1">{ticket.assignedToName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Opened</dt>
          <dd className="mt-1">{new Date(ticket.openedAt).toLocaleString()}</dd>
        </div>
        {ticket.closedAt ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Closed</dt>
            <dd className="mt-1">{new Date(ticket.closedAt).toLocaleString()}</dd>
          </div>
        ) : null}
        {ticket.appointmentAt ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Appointment</dt>
            <dd className="mt-1">{new Date(ticket.appointmentAt).toLocaleString()}</dd>
          </div>
        ) : null}
      </dl>

      <TicketAttachmentsList attachments={ticket.attachments} />
      <MaintenanceAttachmentForm ticketId={ticket.id} />
      <TicketStatusControls ticketId={ticket.id} nextStatuses={nextStatuses} currentStatus={ticket.status} />
    </div>
  );
}
