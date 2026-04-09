import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants, attendance } from "@/lib/db/schema";
import { eq, gt, sql } from "drizzle-orm";

// Get participants who are NOT in the attendance table for the last 12 hours
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Dynamic Time Window: Find the last recorded attendance date in the system
    const lastRecord = await db.select({ date: attendance.date }).from(attendance).orderBy(sql`${attendance.date} DESC`).limit(1);
    
    if (lastRecord.length === 0) {
      // No attendances ever, so everyone is absentee
       const all = await db.select().from(participants);
       return NextResponse.json({ absentees: all });
    }

    const lastDate = new Date(lastRecord[0].date);
    // Create a window that captures the "Night" of that last record (e.g. from 12 hours before it)
    const windowStart = new Date(lastDate);
    windowStart.setHours(windowStart.getHours() - 14);

    const presentIds = await db.select({ id: attendance.participantId })
      .from(attendance)
      .where(gt(attendance.date, windowStart));

    const presentIdsList = presentIds.map(p => p.id);

    // Get all participants

    const allParticipants = await db.select().from(participants);

    // Filter those NOT in the present list
    const absentees = allParticipants.filter(p => !presentIdsList.includes(p.id));

    return NextResponse.json({ absentees });
  } catch (error) {
    console.error("Get absentees error:", error);
    return NextResponse.json({ error: "Erro ao buscar faltosos" }, { status: 500 });
  }
}
