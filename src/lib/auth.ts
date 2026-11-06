import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession, signSession, type SessionPayload } from "./session";

export async function getSession() {
  const c = await cookies();
  return verifySession(c.get(SESSION_COOKIE)?.value);
}

export async function requireUser(roles?: string[]) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (roles && !roles.includes(s.role)) redirect("/");
  return s;
}

export async function createSession(p: SessionPayload) {
  const c = await cookies();
  c.set(SESSION_COOKIE, await signSession(p), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function destroySession() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}
