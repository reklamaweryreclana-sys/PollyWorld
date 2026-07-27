import { COOKIE_NAME } from "@/lib/auth";
import { redirectTo } from "@/lib/redirect";

export async function POST() {
  const response = redirectTo("/");
  response.cookies.delete(COOKIE_NAME);
  return response;
}
