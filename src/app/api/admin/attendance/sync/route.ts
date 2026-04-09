import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { participantId, count } = await req.json();
    if (!participantId || count === undefined) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const currentRecords = await db.select().from(attendance).where(eq(attendance.participantId, participantId)).orderBy(asc(attendance.date));
    const currentCount = currentRecords.length;

    if (count > currentCount) {
      // Add missing records
      const toAdd = count - currentCount;
      const values = Array(toAdd).fill({
        participantId: participantId,
        volunteerId: session.userId,
        description: "Presença Manual (Ajuste Rápido)"
      });
      await db.insert(attendance).values(values);
    } else if (count < currentCount) {
      // Remove records (starting from generic ones or oldest)
      const toRemove = currentCount - count;
      // Filter generically or just remove the most recent/oldest ones.
      // Let's remove the generic ones first, if any, else the oldest.
      const genericRecords = currentRecords.filter(r => r.description === "Presença Manual (Ajuste Rápido)");
      const otherRecords = currentRecords.filter(r => r.description !== "Presença Manual (Ajuste Rápido)");
      
      const recordsToDelete = [...genericRecords, ...otherRecords].slice(0, toRemove);
      
      for (const record of recordsToDelete) {
        await db.delete(attendance).where(eq(attendance.id, record.id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Sync attendance error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
