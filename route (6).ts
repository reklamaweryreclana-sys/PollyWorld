import { db } from "@/db";
import { staffMembers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { redirectTo } from "@/lib/redirect";
import { eq } from "drizzle-orm";

export async function GET() {
  return redirectTo("/?error=Удаление+доступно+только+через+кнопку");
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return redirectTo("/?error=Недостаточно+прав");
  }

  const formData = await request.formData();
  const staffId = Number(formData.get("staffId") ?? 0);
  if (!staffId) {
    return redirectTo("/?error=Некорректный+ID+сотрудника");
  }

  const member = await db.query.staffMembers.findFirst({ where: eq(staffMembers.id, staffId) });
  if (!member) {
    return redirectTo("/?error=Сотрудник+не+найден");
  }

  if (member.rank === "owner") {
    return redirectTo("/?error=Владельца+удалять+нельзя");
  }

  try {
    await db.delete(staffMembers).where(eq(staffMembers.id, staffId));
    return redirectTo("/?success=Сотрудник+удалён");
  } catch {
    return redirectTo("/?error=Не+удалось+удалить+сотрудника");
  }
}
