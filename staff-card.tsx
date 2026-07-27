import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { redirectTo } from "@/lib/redirect";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return redirectTo("/?error=Сначала+войдите+в+аккаунт");
  }

  const formData = await request.formData();
  const oldPassword = String(formData.get("oldPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "").trim();

  if (!oldPassword || newPassword.length < 6) {
    return redirectTo("/?error=Новый+пароль+должен+быть+не+короче+6+символов");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.username, currentUser.username),
  });

  if (!user || !verifyPassword(oldPassword, user.passwordHash)) {
    return redirectTo("/?error=Старый+пароль+неверный");
  }

  await db
    .update(users)
    .set({
      passwordHash: hashPassword(newPassword),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return redirectTo("/?success=Пароль+успешно+обновлён");
}
