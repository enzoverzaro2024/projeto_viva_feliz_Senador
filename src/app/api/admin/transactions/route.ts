import { db } from "@/lib/db";
import { transactions, participants } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const list = await db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        description: transactions.description,
        createdAt: transactions.createdAt,
        participantName: participants.name,
        cardNumber: participants.cardNumber,
      })
      .from(transactions)
      .leftJoin(participants, eq(transactions.participantId, participants.id))
      .orderBy(desc(transactions.createdAt));

    return NextResponse.json({ transactions: list });
  } catch (err) {
    console.error("Error fetching transactions:", err);
    return NextResponse.json({ error: "Erro ao buscar histórico de transações" }, { status: 500 });
  }
}
