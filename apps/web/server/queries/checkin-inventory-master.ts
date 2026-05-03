import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function listCheckinInventoryMasterItems() {
  try {
    return await prisma.checkinInventoryMasterItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }]
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return [];
    }
    throw e;
  }
}
