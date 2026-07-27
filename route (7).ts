import { db } from "@/db";
import { staffMembers, warnEvents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { RANKS } from "@/lib/ranks";
import { redirectTo } from "@/lib/redirect";

const allowedRanks = new Set(RANKS.map((item) => item.key));

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return redirectTo("/?error=Недостаточно+прав");
  }

  const formData = await request.formData();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const rank = String(formData.get("rank") ?? "").trim();
  const statusText = String(formData.get("statusText") ?? "🟢 На посту").trim() || "🟢 На посту";
  const initialWarns = Number(formData.get("initialWarns") ?? 0);

  if (!nickname || !allowedRanks.has(rank)) {
    return redirectTo("/?error=Проверьте+ник+и+должность");
  }

  const safeWarns = Number.isFinite(initialWarns) ? Math.min(4, Math.max(0, Math.floor(initialWarns))) : 0;

  try {
    const inserted = await db
      .insert(staffMembers)
      .values({ nickname, rank, statusText, warnsCount: safeWarns })
      .returning({ id: staffMembers.id });

    const created = inserted[0];
    if (created) {
      for (let i = 0; i < safeWarns; i += 1) {
        await db.insert(warnEvents).values({
          staffId: created.id,
          actionType: "issue",
          reason: `Стартовый варн #${i + 1}`,
          createdBy: user.username,
        });
      }
    }
  } catch {
    return redirectTo("/?error=Ник+уже+существует");
  }

  return redirectTo("/?success=Сотрудник+добавлен");
}
