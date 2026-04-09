import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, participants, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST: Change role OR Create new user
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const requester = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (requester[0]?.role !== "admin") {
      return NextResponse.json({ error: "Apenas admins" }, { status: 403 });
    }

    const body = await req.json();

    // If "action" is "create", create a new user
    if (body.action === "create") {
      const { name, email, password, role } = body;
      if (!name || !email || !password) {
        return NextResponse.json({ error: "Nome, email e senha são obrigatórios" }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ error: "Senha deve ter no mínimo 6 caracteres" }, { status: 400 });
      }

      // Check if email already exists
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) {
        return NextResponse.json({ error: "Este email já está em uso" }, { status: 400 });
      }

      const hashedPassword = await hashPassword(password);
      await db.insert(users).values({
        name,
        email,
        password: hashedPassword,
        role: role || "user",
      });

      return NextResponse.json({ success: true, message: `Usuário "${name}" criado com sucesso` });
    }

    // Otherwise, change role
    const { userId, role } = body;
    if (!role || !["admin", "volunteer", "user"].includes(role)) {
      return NextResponse.json({ error: "Role inválido" }, { status: 400 });
    }

    const targetId = userId || session.userId;
    await db.update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, targetId));

    return NextResponse.json({ success: true, message: `Role atualizado para ${role}` });
  } catch (error: any) {
    console.error("Admin users POST error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// GET: List all users
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const requester = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (requester[0]?.role !== "admin") {
      return NextResponse.json({ error: "Apenas admins" }, { status: 403 });
    }

    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users);

    return NextResponse.json({ users: allUsers });
  } catch (error: any) {
    console.error("Admin list error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// DELETE: Remove a user
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const requester = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (requester[0]?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "ID do usuário obrigatório" }, { status: 400 });
    }
    if (userId === session.userId) {
      return NextResponse.json({ error: "Você não pode excluir a si mesmo" }, { status: 400 });
    }

    const userParticipants = await db.select({ id: participants.id }).from(participants).where(eq(participants.userId, userId));
    for (const p of userParticipants) {
      await db.delete(transactions).where(eq(transactions.participantId, p.id));
    }
    await db.delete(participants).where(eq(participants.userId, userId));
    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin delete user error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// PATCH: Update user name/email AND/OR password
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const requester = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (requester[0]?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { userId, name, email, password } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "ID do usuário obrigatório" }, { status: 400 });
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: "Senha deve ter no mínimo 6 caracteres" }, { status: 400 });
      }
      updateData.password = await hashPassword(password);
    }

    await db.update(users).set(updateData).where(eq(users.id, userId));

    return NextResponse.json({ success: true, message: password ? "Senha atualizada!" : "Usuário atualizado!" });
  } catch (error: any) {
    console.error("Admin update user error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
