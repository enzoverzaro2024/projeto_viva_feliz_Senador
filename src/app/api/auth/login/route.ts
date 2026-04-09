import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, participants } from "@/lib/db/schema";
import { verifyPassword, createSession, COOKIE_NAME } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    // First, try to login as a participant if password is "123456"
    if (password === "123456") {
      // The "email" field might actually be the card number typed by the user
      // Require drizzle import: import { participants } from "@/lib/db/schema";
      let pQuery = await db.select().from(participants).where(eq(participants.cardNumber, email)).limit(1);
      if (pQuery.length > 0) {
        const p = pQuery[0];
        const token = await createSession({
          userId: p.id, // Em vez de user.id, passa o participant.id
          email: p.cardNumber || "",
          role: "participant",
        });

        const response = NextResponse.json({
          user: {
            id: p.id,
            name: p.name,
            email: p.cardNumber,
            role: "participant",
          },
        });

        response.cookies.set(COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60,
          path: "/",
        });

        return response;
      }
    }

    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = result[0];

    if (!user) {
      return NextResponse.json(
        { error: "Email/Cartão ou senha inválidos" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Email ou senha inválidos" },
        { status: 401 }
      );
    }

    // Update last sign in
    await db.update(users).set({ updatedAt: new Date() }).where(eq(users.id, user.id));

    const token = await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
