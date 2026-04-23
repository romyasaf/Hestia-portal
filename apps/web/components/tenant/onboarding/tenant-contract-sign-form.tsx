"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState, useTransition } from "react";
import { signTenantLeaseContract } from "@/server/actions/tenant-onboarding";
import { Button } from "@/components/ui/button";

export function TenantContractSignForm({ contractText }: { contractText: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const downloadTxt = () => {
    const blob = new Blob([contractText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hestia-lease-summary.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const printContract = () => {
    window.print();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const res = await signTenantLeaseContract({ signerName: name });
      if (!res.ok) {
        setMsg(
          res.error === "already_signed"
            ? "Already signed — continue to the next step."
            : res.error === "missing_signer"
              ? "Enter your full name as it appears on the lease."
              : "Could not save signature."
        );
        return;
      }
      router.push("/tenant/onboarding/cheques");
      router.refresh();
    });
  };

  return (
    <div ref={printRef} className="space-y-4 rounded-xl border border-border bg-card p-6 print:border-0 print:shadow-none">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button type="button" variant="outline" size="sm" onClick={printContract}>
          Print
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={downloadTxt}>
          Download (.txt)
        </Button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium" htmlFor="sig-name">
            Full name (electronic signature)
          </label>
          <input
            id="sig-name"
            required
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type your full legal name"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            By submitting, you agree this typed name constitutes your signature on the lease summary above.
          </p>
        </div>
        {msg ? <p className="text-sm text-destructive">{msg}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Sign and continue"}
        </Button>
      </form>
    </div>
  );
}
