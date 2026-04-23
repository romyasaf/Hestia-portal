export const CHEQUE_DELIVERY_STATES = ["pending", "appointment_booked", "marked_delivered", "approved"] as const;

export type ChequeDeliveryState = (typeof CHEQUE_DELIVERY_STATES)[number];

export function isChequeDeliveryState(v: string): v is ChequeDeliveryState {
  return (CHEQUE_DELIVERY_STATES as readonly string[]).includes(v);
}

export function chequeDeliveryLabel(s: string): string {
  const x = s.toLowerCase();
  const m: Record<string, string> = {
    pending: "Awaiting your next step",
    appointment_booked: "Appointment booked",
    marked_delivered: "Waiting for office to confirm receipt",
    approved: "Cheques confirmed — continue to check-in"
  };
  return m[x] ?? s;
}
