import { prisma } from "@/lib/prisma";

export async function listUnitInventoryItemsForAdmin(unitId: string) {
  return prisma.unitInventoryItem.findMany({
    where: { unitId },
    orderBy: [{ category: "asc" }, { itemName: "asc" }]
  });
}
