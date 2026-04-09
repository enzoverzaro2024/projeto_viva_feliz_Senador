import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { attendance, participants, eventSettings, transactions } from "@/lib/db/schema";
import { eq, and, gt, gte, lte, sql } from "drizzle-orm";

// Record attendance
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "volunteer" && session.role !== "admin")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { participantId, date, addPoints, description } = await req.json();

    if (!participantId) {
      return NextResponse.json({ error: "Participante obrigatório" }, { status: 400 });
    }

    // Check if participant exists
    const participant = await db.select().from(participants).where(eq(participants.id, participantId)).limit(1);
    if (participant.length === 0) {
      return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 });
    }

    // Date logic (default now or provided for retroactive)
    const recordDate = date ? new Date(date) : new Date();

    // Antiduplicity strictly on the target calendar day
    const targetStart = new Date(recordDate);
    targetStart.setHours(0, 0, 0, 0);
    
    const targetEnd = new Date(recordDate);
    targetEnd.setHours(23, 59, 59, 999);

    const alreadyPresent = await db.select().from(attendance)
      .where(
         and(
           eq(attendance.participantId, participantId), 
           gte(attendance.date, targetStart),
           lte(attendance.date, targetEnd)
         )
      )
      .limit(1);

    if (alreadyPresent.length > 0) {
      return NextResponse.json({ error: "Presença já registrada para este dia!" }, { status: 400 });
    }

    // Get attendance points config
    const settings = await db.select().from(eventSettings).where(eq(eventSettings.id, 1)).limit(1);
    
    // Regra nova: Só adiciona os 50 pontos a partir do dia 05/04/2026
    const limitDate = new Date("2026-04-05T00:00:00-03:00"); // 5 de Abril de 2026 BRT
    const isEligibleForPoints = recordDate.getTime() >= limitDate.getTime();
    
    const pointsToGiveStr = (addPoints !== false && isEligibleForPoints) ? (settings[0]?.attPoints || "50") : "0";
    const pointsToGive = parseFloat(pointsToGiveStr);

    // Transaction for points if > 0
    if (pointsToGive > 0) {
      await db.insert(transactions).values({
        participantId,
        volunteerId: session.userId,
        amount: pointsToGive.toString(),
        description: description || "Pontos de Presença",
        createdAt: recordDate
      });

      // Update participant balance
      await db.update(participants)
        .set({ currentBalance: sql`${participants.currentBalance} + ${pointsToGive}` })
        .where(eq(participants.id, participantId));
    }

    // Insert attendance record
    await db.insert(attendance).values({
      participantId,
      volunteerId: session.userId,
      date: recordDate,
      description: description || (date ? "Presença Retroativa" : "Presença na Noite")
    });

    return NextResponse.json({ 
      success: true, 
      message: `Presença registrada! ${pointsToGive > 0 ? `+${pointsToGive} pts ganhos.` : '(Sem pontos adicionados)'}` 
    });
  } catch (error) {
    console.error("Attendance error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
