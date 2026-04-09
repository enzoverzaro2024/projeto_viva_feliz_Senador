import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, participants } from "@/lib/db/schema";
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

    const result = await db.select().from(transactions)
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
