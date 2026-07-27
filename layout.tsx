import { db } from "@/db";
import { staffMembers, warnEvents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { redirectTo } from "@/lib/redirect";
import { and, eq, sql } from "drizzle-orm";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return redirectTo("/?error=Недостаточно+прав");
  }

  const formData = await request.formData();
  const staffId = Number(formData.get("staffId") ?? 0);
  const actionType = String(formData.get("actionType") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!staffId || (actionType !== "issue" && actionType !== "remove")) {
    return redirectTo("/?error=Некорректный+запрос");
  }

  const member = await db.query.staffMembers.findFirst({ where: eq(staffMembers.id, staffId) });
  if (!member) {
    return redirectTo("/?error=Сотрудник+не+найден");
  }

  if (member.rank === "owner") {
    return redirectTo("/?error=Для+владельца+выговоры+отключены");
  }

  if (actionType === "issue") {
    if (!reason) {
      return redirectTo("/?error=Нужна+причина+варна");
    }

    const nextWarns = Math.min(4, member.warnsCount + 1);

    await db.transaction(async (tx) => {
      await tx.insert(warnEvents).values({
        staffId,
        actionType,
        reason,
        createdBy: user.username,
      });

      await tx
        .update(staffMembers)
        .set({
          warnsCount: nextWarns,
          updatedAt: new Date(),
        })
        .where(eq(staffMembers.id, staffId));
    });

    return redirectTo("/?success=Варн+выдан");
  }

  if (member.warnsCount <= 0) {
    return redirectTo("/?error=У+сотрудника+нет+варнов");
  }

  await db.transaction(async (tx) => {
    await tx.insert(warnEvents).values({
      staffId,
      actionType,
      reason: reason || "Причина снятия не указана",
      createdBy: user.username,
    });

    await tx
      .update(staffMembers)
      .set({
        warnsCount: sql`greatest(${staffMembers.warnsCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(and(eq(staffMembers.id, staffId), eq(staffMembers.nickname, member.nickname)));
  });

  return redirectTo("/?success=Варн+снят");
}
