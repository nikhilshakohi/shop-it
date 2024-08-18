import db from "@/dev/dev";
import { notFound } from "next/navigation";

// Delete Product data
export async function deleteOrder(id: string) {
  const order = await db.order.delete({ where: { id } });

  if (order === null) return notFound();

  return order;
}
