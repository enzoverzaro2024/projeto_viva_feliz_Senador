import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants, attendance } from "@/lib/db/schema";
import { eq, gt, inArray, sql } from "drizzle-orm";

// Get participants who DID attend in the last 12 hours
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Dynamic Time Window: Find the last recorded attendance date in the system
    const lastRecord = await db.select({ date: attendance.date }).from(attendance).orderBy(sql`${attendance.date} DESC`).limit(1);
    
    if (lastRecord.length === 0) {
      return NextResponse.json({ attendees: [] });
    }

    const lastDate = new Date(lastRecord[0].date);
    const windowStart = new Date(lastDate);
    windowStart.setHours(windowStart.getHours() - 14);

    const presentRecords = await db.select({ id: attendance.participantId })
      .from(attendance)
      .where(gt(attendance.date, windowStart));

    const presentIds = presentRecords.map(p => p.id);

    if (presentIds.length === 0) {
      return NextResponse.json({ attendees: [] });
    }

    // Get details for those present
    const attendees = await db.select().from(participants).where(inArray(participants.id, presentIds));

    return NextResponse.json({ attendees });
  } catch (error) {
    console.error("Get attendees error:", error);
    return NextResponse.json({ error: "Erro ao buscar comparecimentos" }, { status: 500 });
  }
}
