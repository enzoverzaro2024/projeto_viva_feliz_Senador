import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants, transactions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const SUPER_ADMIN_EMAIL = "enzo@nb.com";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verify Super Admin
    const userList = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    const currentUser = userList[0];

    const isSuperAdmin = currentUser && (
      currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ||
      currentUser.role === "admin" && session.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    );

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Acesso negado. Apenas o Super Admin tem permissão para zerar as movimentações." },
        { status: 403 }
      );
    }

    // 1. Delete all transactions (credits and debits)
    await db.delete(transactions);

    // 2. Reset all participants' balances to 0.00
    await db.update(participants).set({
      currentBalance: "0.00",
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Todas as movimentações (créditos e vendas) foram apagadas e os saldos foram zerados para G$ 0!",
    });
  } catch (error: any) {
    console.error("Reset transactions error:", error);
    return NextResponse.json(
      { error: "Erro interno ao zerar movimentações: " + (error.message || "Erro no banco de dados") },
      { status: 500 }
    );
  }
}
