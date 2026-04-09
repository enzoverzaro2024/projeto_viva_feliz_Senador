import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, participants } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (session.role !== "volunteer" && session.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas líderes/voluntários podem validar missões" },
        { status: 403 }
      );
    }

    const { participantId, amount, description } = await req.json();

    if (!participantId || !amount) {
      return NextResponse.json(
        { error: "Participante e pontuação são obrigatórios" },
        { status: 400 }
      );
    }

    const amountRegex = /^\d+(\.\d{1,2})?$/;
    if (!amountRegex.test(amount)) {
      return NextResponse.json(
        { error: "Pontuação inválida" },
        { status: 400 }
      );
    }

    // Check participant exists
    const participant = await db.select().from(participants)
      .where(eq(participants.id, participantId)).limit(1);

    if (participant.length === 0) {
      return NextResponse.json(
        { error: "Participante não encontrado" },
        { status: 404 }
      );
    }

    // Create transaction
    const result = await db.insert(transactions).values({
      participantId,
      volunteerId: session.userId,
      amount,
      description: description || `Missão concluída`,
    }).returning();

    // Update participant balance
    const currentBalance = parseFloat(participant[0].currentBalance);
    const newBalance = (currentBalance + parseFloat(amount)).toFixed(2);

    await db.update(participants)
      .set({ currentBalance: newBalance, updatedAt: new Date() })
      .where(eq(participants.id, participantId));

    return NextResponse.json({
      success: true,
      transaction: result[0],
      newBalance,
      message: `${parseFloat(amount).toFixed(0)} pontos validados com sucesso`,
    });
  } catch (error: any) {
    console.error("Add credits error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (session.role !== "volunteer" && session.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas voluntários podem visualizar histórico" },
        { status: 403 }
      );
    }

    const result = await db.select().from(transactions)
      .where(eq(transactions.volunteerId, session.userId))
      .orderBy(desc(transactions.createdAt));

    return NextResponse.json({ transactions: result });
  } catch (error: any) {
    console.error("Get volunteer transactions error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
