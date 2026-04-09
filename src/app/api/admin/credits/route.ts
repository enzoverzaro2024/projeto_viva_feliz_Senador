import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants, transactions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// Add credits from admin (select participant from list)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.role !== "admin" && session.role !== "volunteer") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { participantId, amount, description } = await req.json();

    if (!participantId || !amount) {
      return NextResponse.json({ error: "Participante e pontuação obrigatórios" }, { status: 400 });
    }

    const participant = await db.select().from(participants)
      .where(eq(participants.id, participantId)).limit(1);

    if (participant.length === 0) {
      return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 });
    }

    // Create transaction
    const result = await db.insert(transactions).values({
      participantId,
      volunteerId: session.userId,
      amount,
      description: description || "Pontos lançados pelo admin",
    }).returning();

    // Update balance
    const currentBalance = parseFloat(participant[0].currentBalance);
    const newBalance = (currentBalance + parseFloat(amount)).toFixed(2);

    await db.update(participants)
      .set({ currentBalance: newBalance, updatedAt: new Date() })
      .where(eq(participants.id, participantId));

    return NextResponse.json({
      success: true,
      newBalance,
      message: `${parseFloat(amount).toFixed(0)} pontos adicionados com sucesso`,
    });
  } catch (error: any) {
    console.error("Admin add credits error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
