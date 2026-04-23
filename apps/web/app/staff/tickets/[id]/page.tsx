import Link from "next/link";
import { notFound } from "next/navigation";
import { MaintenanceAttachmentForm } from "@/components/maintenance/maintenance-attachment-form";
import { StaffSubmitQuoteForm } from "@/components/maintenance/staff-submit-quote-form";
import { TicketAttachmentsList } from "@/components/maintenance/ticket-attachments-list";
import { TicketStatusControls } from "@/components/maintenance/ticket-status-controls";
import { listAllowedNextStatuses } from "@/lib/maintenance/statuses";
import { requireStaffPortalPermission } from "@/server/auth/session";
import { getTicketById, toTicketDetail } from "@/server/queries/maintenance";

type Props = { params: { id: string } };

function isAdminLike(roles: readonly string[]): boolean {
  return roles.some((r) => r === "admin" || r === "super_admin");
}

export default async function StaffTicketDetailPage({ params }: Props) {
  const session = await requireStaffPortalPermission("staff.maintenance");
  const roles = session.user.roles ?? [];

  const raw = await getTicketById(params.id);
  if (!raw) {
    notFound();
  }

  if (!isAdminLike(roles) && raw.assignedToUserId !== session.user.id) {
    notFound();
  }

  const ticket = toTicketDetail(raw);
  const nextStatuses = listAllowedNextStatuses(ticket.status, roles);
  const showQuoteForm = ticket.status === "Assigned to Staff" && raw.assignedToUserId === session.user.id;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <p className="text-sm">
        <Link href="/staff/tickets" className="text-primary hover:underline">
          ← My tickets
        </Link>
      </p>

      <header className="space-y-2">
        <span className="font-mono text-sm text-muted-foreground">{ticket.ticketNo}</span>
        <h1 className="text-2xl font-semibold tracking-tight">{ticket.title}</h1>
        <p className="text-sm text-muted-foreground">
          {ticket.category} · {ticket.status}
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <p className="whitespace-pre-wrap text-sm">{ticket.description || "—"}</p>
      </section>

      {(ticket.quoteDescription || ticket.quotedAmount) && (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6 text-sm">
          <h2 className="text-sm font-semibold text-muted-foreground">Current quote</h2>
          {ticket.quotedAmount ? <p className="mt-2">Amount: {ticket.quotedAmount}</p> : null}
          {ticket.quoteDescription ? <p className="mt-2 whitespace-pre-wrap">{ticket.quoteDescription}</p> : null}
        </section>
      )}

      {ticket.appointmentAt ? (
        <p className="text-sm text-muted-foreground">
          Appointment: {new Date(ticket.appointmentAt).toLocaleString()}
        </p>
      ) : null}

      <TicketAttachmentsList attachments={ticket.attachments} />
      <MaintenanceAttachmentForm ticketId={ticket.id} />
      {showQuoteForm ? <StaffSubmitQuoteForm ticketId={ticket.id} currentStatus={ticket.status} /> : null}
      <TicketStatusControls ticketId={ticket.id} nextStatuses={nextStatuses} currentStatus={ticket.status} />
    </div>
  );
}
