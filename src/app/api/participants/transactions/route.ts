import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, participants, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const whereClause = session.role === "participant" 
      ? eq(participants.id, session.userId) 
      : eq(participants.userId, session.userId);

    const participant = await db.select().from(participants)
      .where(whereClause).limit(1);

    if (participant.length === 0) {
      return NextResponse.json({ transactions: [] });
    }

    const result = await db.select({
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
      .where(eq(transactions.participantId, participant[0].id))
      .orderBy(desc(transactions.createdAt));

    return NextResponse.json({ transactions: result });
  } catch (error: any) {
    console.error("Get participant transactions error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
