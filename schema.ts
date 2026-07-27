import { db } from "@/db";
import { users } from "@/db/schema";
import { COOKIE_NAME, createSessionToken, getSessionCookieOptions, verifyPassword } from "@/lib/auth";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { redirectTo } from "@/lib/redirect";
import { and, eq } from "drizzle-orm";

export async function POST(request: Request) {
  await ensureBootstrapData();

  const formData = await request.formData();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return redirectTo("/?error=Заполните+логин+и+пароль");
  }

  const user = await db.query.users.findFirst({
    where: and(eq(users.username, username), eq(users.role, "owner")),
  });

  const deputy = await db.query.users.findFirst({
    where: and(eq(users.username, username), eq(users.role, "deputy")),
  });

  const resolved = user ?? deputy;
  if (!resolved || !verifyPassword(password, resolved.passwordHash)) {
    return redirectTo("/?error=Неверные+данные+входа");
  }

  const response = redirectTo("/");
  response.cookies.set(
    COOKIE_NAME,
    createSessionToken({ username: resolved.username, role: resolved.role as "owner" | "deputy" }),
    getSessionCookieOptions(),
  );

  return response;
}
