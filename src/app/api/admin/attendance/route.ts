import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { attendance, participants, eventSettings, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Obter todas as presenças (já existia em get)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const allRecords = await db.select().from(attendance);
    return NextResponse.json({ attendance: allRecords });
  } catch (error: any) {
    console.error("Admin list attendance error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// Deletar uma presença específica
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID da presença obrigatório" }, { status: 400 });
    }

    const record = await db.select().from(attendance).where(eq(attendance.id, id)).limit(1);
    if (record.length === 0) {
       return NextResponse.json({ error: "Presença não encontrada" }, { status: 404 });
    }

    const attRecord = record[0];

    // Find points to deduct
    const settings = await db.select().from(eventSettings).where(eq(eventSettings.id, 1)).limit(1);
    const pointsToDeduct = parseFloat(settings[0]?.attPoints || "50");

    if (pointsToDeduct > 0) {
      // Log transaction
      await db.insert(transactions).values({
        participantId: attRecord.participantId,
        volunteerId: session.userId,
        amount: (-pointsToDeduct).toString(),
        description: "Estorno: Remoção de Presença"
      });

      // Deduct from participant
      const part = await db.select().from(participants).where(eq(participants.id, attRecord.participantId)).limit(1);
      if (part.length > 0) {
         const newBalance = (parseFloat(part[0].currentBalance) - pointsToDeduct).toFixed(2);
         await db.update(participants).set({ currentBalance: newBalance }).where(eq(participants.id, attRecord.participantId));
      }
    }

    await db.delete(attendance).where(eq(attendance.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin delete attendance error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
