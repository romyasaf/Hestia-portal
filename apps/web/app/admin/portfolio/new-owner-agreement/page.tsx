import Link from "next/link";
import { OwnerAgreementWizardForm } from "@/components/admin/portfolio/owner-agreement-wizard-form";

export default function NewOwnerAgreementWizardPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm">
        <Link href="/admin/portfolio" className="font-medium text-primary hover:underline">
          ← Portfolio
        </Link>
      </p>
      <header className="mt-6 border-b border-border/80 pb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Guided setup</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Start new owner agreement</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Create the owner account, building, optional units, and first owner contract in one flow. You can still
          adjust everything later from Portfolio and owner detail pages.
        </p>
      </header>
      <div className="py-10">
        <OwnerAgreementWizardForm />
      </div>
    </div>
  );
}
