import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ReceiptDb = {
  receipt: {
    findUnique: (args: {
      where: { receiptNo: string };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
};

/** Works inside `prisma.$transaction` or on the root client. */
export async function allocateReceiptNo(db: ReceiptDb): Promise<string> {
  for (let i = 0; i < 10; i += 1) {
    const candidate = `RC-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
    const clash = await db.receipt.findUnique({ where: { receiptNo: candidate }, select: { id: true } });
    if (!clash) {
      return candidate;
    }
  }
  throw new Error("Could not allocate receipt number");
}

export async function uniqueReceiptNo(): Promise<string> {
  return allocateReceiptNo(prisma);
}
