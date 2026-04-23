import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAssignStaffForm } from "@/components/maintenance/admin-assign-staff-form";
import { AdminTicketOpsForm } from "@/components/maintenance/admin-ticket-ops-form";
import { MaintenanceAttachmentForm } from "@/components/maintenance/maintenance-attachment-form";
import { StaffSubmitQuoteForm } from "@/components/maintenance/staff-submit-quote-form";
import { TicketAttachmentsList } from "@/components/maintenance/ticket-attachments-list";
import { TicketStatusControls } from "@/components/maintenance/ticket-status-controls";
import { listAllowedNextStatuses } from "@/lib/maintenance/statuses";
import { requireSession } from "@/server/auth/session";
import { getTicketById, listStaffUsersForAssignment, toTicketDetail } from "@/server/queries/maintenance";

type Props = { params: { id: string } };

export default async function AdminMaintenanceDetailPage({ params }: Props) {
  const session = await requireSession();
  const roles = session.user.roles ?? [];
  if (!roles.some((r) => r === "admin" || r === "super_admin")) {
    notFound();
  }

  const raw = await getTicketById(params.id);
  if (!raw) {
    notFound();
  }

  const ticket = toTicketDetail(raw);
  const nextStatuses = listAllowedNextStatuses(ticket.status, roles);
  const staff = await listStaffUsersForAssignment();

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <p className="text-sm">
        <Link href="/admin/maintenance" className="text-primary hover:underline">
          ← All tickets
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
        <p className="mt-2 whitespace-pre-wrap text-sm">{ticket.description || "—"}</p>
      </section>

      {(ticket.quoteDescription || ticket.quotedAmount) && (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-muted-foreground">Quote</h2>
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

      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase text-muted-foreground">Opened by</dt>
          <dd className="mt-1">{ticket.openedByName}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-muted-foreground">Assigned to</dt>
          <dd className="mt-1">{ticket.assignedToName ?? "—"}</dd>
        </div>
        {ticket.appointmentAt ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase text-muted-foreground">Appointment</dt>
            <dd className="mt-1">{new Date(ticket.appointmentAt).toLocaleString()}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs font-medium uppercase text-muted-foreground">Permission to enter if away</dt>
          <dd className="mt-1">{ticket.permissionToEnter ? "Yes" : "No"}</dd>
        </div>
      </dl>

      <AdminTicketOpsForm ticketId={ticket.id} approvalNeeded={ticket.approvalNeeded} internalCost={ticket.internalCost} />
      <TicketAttachmentsList attachments={ticket.attachments} />
      <MaintenanceAttachmentForm ticketId={ticket.id} />
      <AdminAssignStaffForm ticketId={ticket.id} staff={staff} />
      <TicketStatusControls ticketId={ticket.id} nextStatuses={nextStatuses} currentStatus={ticket.status} />
    </div>
  );
}
