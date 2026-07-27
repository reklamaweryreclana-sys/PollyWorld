import { db } from "@/db";
import { staffLikes, staffMembers } from "@/db/schema";
import { redirectTo } from "@/lib/redirect";
import { getOrCreateVisitorId } from "@/lib/visitor";
import { and, eq, sql } from "drizzle-orm";

export async function POST(request: Request) {
  const formData = await request.formData();
  const staffId = Number(formData.get("staffId") ?? 0);
  if (!staffId) {
    return redirectTo("/?error=Некорректный+лайк");
  }

  const visitorId = await getOrCreateVisitorId();

  await db.transaction(async (tx) => {
    const member = await tx.query.staffMembers.findFirst({ where: eq(staffMembers.id, staffId) });
    if (!member) return;

    const existingLike = await tx.query.staffLikes.findFirst({
      where: and(eq(staffLikes.staffId, staffId), eq(staffLikes.visitorId, visitorId)),
    });

    if (existingLike) {
      await tx.delete(staffLikes).where(eq(staffLikes.id, existingLike.id));
      await tx
        .update(staffMembers)
        .set({
          likesCount: sql`greatest(${staffMembers.likesCount} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(staffMembers.id, staffId));
      return;
    }

    await tx.insert(staffLikes).values({ staffId, visitorId });
    await tx
      .update(staffMembers)
      .set({
        likesCount: sql`${staffMembers.likesCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(staffMembers.id, staffId));
  });

  const referer = request.headers.get("referer") || "/";
  try {
    const url = new URL(referer);
    return redirectTo(`${url.pathname}${url.search}` || "/");
  } catch {
    return redirectTo("/");
  }
}
