import { NextResponse } from "next/server";

/** Liveness for load balancers / Vercel — no auth, no DB. */
export function GET() {
  return NextResponse.json({
    ok: true,
    service: "hestia-web",
    timestamp: new Date().toISOString()
  });
}
