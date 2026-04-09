import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const result = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    }).from(users).where(eq(users.id, session.userId)).limit(1);

    if (result.length === 0) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: result[0] });
  } catch {
    return NextResponse.json({ user: null });
  }
}
