import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { eventSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Get event info
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const settings = await db.select().from(eventSettings).where(eq(eventSettings.id, 1)).limit(1);
    
    return NextResponse.json({ eventInfo: settings[0] || null });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar info" }, { status: 500 });
  }
}

// Update event info
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { projectName, location, prevSummary, prizesList, nextChallenge, tonightPoints, attPoints, customMessage } = await req.json();

    // Check if exists
    const existing = await db.select().from(eventSettings).where(eq(eventSettings.id, 1)).limit(1);

    if (existing.length > 0) {
      await db.update(eventSettings)
        .set({ projectName, location, prevSummary, prizesList, nextChallenge, tonightPoints, attPoints, customMessage, updatedBy: session.userId, updatedAt: new Date() })
        .where(eq(eventSettings.id, 1));
    } else {
      await db.insert(eventSettings).values({
        id: 1,
        projectName,
        location,
        prevSummary,
        prizesList,
        nextChallenge,
        tonightPoints,
        attPoints,
        customMessage,
        updatedBy: session.userId
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ERRO COMPLETO NO BANCO:", error);
    return NextResponse.json({ 
      error: "Erro ao salvar no banco", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
