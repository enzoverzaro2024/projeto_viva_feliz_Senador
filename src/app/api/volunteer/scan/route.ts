import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants, transactions, users } from "@/lib/db/schema";
import { eq, or, ilike, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (session.role !== "volunteer" && session.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas voluntários podem escanear cartões" },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const q = url.searchParams.get("cardId"); // "q" pode ser cardId, cardNumber ou nome

    if (!q) {
      return NextResponse.json(
        { error: "ID, Nome ou Número de identificação é obrigatório" },
        { status: 400 }
      );
    }

    const result = await db.select().from(participants)
      .where(
        or(
          eq(participants.cardId, q),
          eq(participants.cardNumber, q),
          ilike(participants.name, `%${q}%`)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Cartão não encontrado" },
        { status: 404 }
      );
    }

    const participant = result[0];

    const recentTransactions = await db.select({
      id: transactions.id,
      participantId: transactions.participantId,
      volunteerId: transactions.volunteerId,
      amount: transactions.amount,
      description: transactions.description,
      createdAt: transactions.createdAt,
      volunteerName: users.name,
      volunteerEmail: users.email,
    })
      .from(transactions)
      .leftJoin(users, eq(transactions.volunteerId, users.id))
      .where(eq(transactions.participantId, participant.id))
      .orderBy(desc(transactions.createdAt))
      .limit(10);

    return NextResponse.json({ 
      participant,
      transactions: recentTransactions 
    });
  } catch (error: any) {
    console.error("Scan card error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
