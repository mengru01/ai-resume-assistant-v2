import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

export const USER_COOKIE = "aro_uid";

const thirtyDays = 60 * 60 * 24 * 30;

function cookieSecret() {
  if (process.env.NODE_ENV === "production" && !process.env.COOKIE_SECRET) {
    throw new Error("COOKIE_SECRET is required in production.");
  }

  return process.env.COOKIE_SECRET ?? "development-only-cookie-secret";
}

function signUserId(userId: string) {
  return createHmac("sha256", cookieSecret()).update(userId).digest("base64url");
}

function encodeUserCookie(userId: string) {
  return `${userId}.${signUserId(userId)}`;
}

function decodeUserCookie(value?: string) {
  if (!value) return null;
  const [userId, signature] = value.split(".");
  if (!userId || !signature) return null;

  const expected = signUserId(userId);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  return userId;
}

export async function getOrCreateUser() {
  const cookieStore = cookies();
  const existingId = decodeUserCookie(cookieStore.get(USER_COOKIE)?.value);

  if (existingId) {
    const user = await prisma.user.findUnique({ where: { id: existingId } });
    if (user) return user;
  }

  const user = await prisma.user.create({ data: {} });
  cookieStore.set(USER_COOKIE, encodeUserCookie(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: thirtyDays,
    path: "/"
  });

  return user;
}

export async function getCurrentUser() {
  const id = decodeUserCookie(cookies().get(USER_COOKIE)?.value);
  if (!id) return null;

  return prisma.user.findUnique({ where: { id } });
}
