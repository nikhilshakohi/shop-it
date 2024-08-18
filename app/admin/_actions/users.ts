import db from "@/dev/dev";
import { notFound } from "next/navigation";

// Delete Product data
export async function deleteUser(id: string) {
  const user = await db.user.delete({ where: { id } });

  if (user === null) return notFound();

  return user;
}
