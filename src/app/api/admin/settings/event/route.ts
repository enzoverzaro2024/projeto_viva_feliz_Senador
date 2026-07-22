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

    // Ensure table exists and has columns before select
    try {
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS event_settings (id SERIAL PRIMARY KEY);
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS project_name TEXT DEFAULT 'Viva Feliz';
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS prev_summary TEXT;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS prizes_list TEXT;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS next_challenge TEXT;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS tonight_points TEXT;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS att_points DECIMAL(10,2) DEFAULT 50;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS custom_message TEXT;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS card_template_image TEXT;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS template_qr_x INTEGER DEFAULT 330;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS template_qr_y INTEGER DEFAULT 80;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS template_qr_size INTEGER DEFAULT 180;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS visible_tabs TEXT;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS auction_enabled INTEGER DEFAULT 0;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS updated_by INTEGER;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();
      `);
    } catch {}

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

    // AGGRESSIVE AUTO-REPAIR: Ensure all columns exist
    try {
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS event_settings (id SERIAL PRIMARY KEY);
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS project_name TEXT DEFAULT 'Viva Feliz';
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS prev_summary TEXT;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS prizes_list TEXT;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS next_challenge TEXT;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS tonight_points TEXT;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS att_points DECIMAL(10,2) DEFAULT 50;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS custom_message TEXT;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS card_template_image TEXT;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS template_qr_x INTEGER DEFAULT 330;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS template_qr_y INTEGER DEFAULT 80;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS template_qr_size INTEGER DEFAULT 180;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS visible_tabs TEXT;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS auction_enabled INTEGER DEFAULT 0;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS updated_by INTEGER;
        ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();
      `);
    } catch (e) {
      console.error("Erro no auto-repair:", e);
    }

    const { projectName, location, prevSummary, prizesList, nextChallenge, tonightPoints, attPoints, customMessage, visibleTabs, auctionEnabled } = await req.json();

    // Sanitize attPoints to ensure it's a valid string for decimal or null
    const safeAttPoints = (attPoints && attPoints.trim() !== "") ? attPoints.toString() : "50";

    // Check if exists
    const existing = await db.select().from(eventSettings).where(eq(eventSettings.id, 1)).limit(1);

    if (existing.length > 0) {
      await db.update(eventSettings)
        .set({ 
          projectName: projectName || "Viva Feliz", 
          location: location || "", 
          prevSummary: prevSummary || "", 
          prizesList: prizesList || "", 
          nextChallenge: nextChallenge || "", 
          tonightPoints: tonightPoints || "", 
          attPoints: safeAttPoints, 
          customMessage: customMessage || "", 
          visibleTabs: visibleTabs || null,
          auctionEnabled: auctionEnabled ? 1 : 0,
          updatedBy: session.userId, 
          updatedAt: new Date() 
        })
        .where(eq(eventSettings.id, 1));
    } else {
      await db.insert(eventSettings).values({
        id: 1,
        projectName: projectName || "Viva Feliz",
        location: location || "",
        prevSummary: prevSummary || "",
        prizesList: prizesList || "",
        nextChallenge: nextChallenge || "",
        tonightPoints: tonightPoints || "",
        attPoints: safeAttPoints,
        customMessage: customMessage || "",
        visibleTabs: visibleTabs || null,
        auctionEnabled: auctionEnabled ? 1 : 0,
        updatedBy: session.userId
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("ERRO COMPLETO NO BANCO:", error);

    // Auto-migration: if column custom_message is missing, try to add it
    if (error?.message?.includes('column "custom_message" of relation "event_settings" does not exist')) {
      try {
        console.log("Detectada coluna faltando. Tentando adicionar custom_message...");
        const { sql } = await import("drizzle-orm");
        await db.execute(sql`ALTER TABLE event_settings ADD COLUMN IF NOT EXISTS custom_message TEXT`);
        return NextResponse.json({ 
          success: false, 
          error: "A coluna 'custom_message' estava faltando e foi adicionada agora. Por favor, TENTE SALVAR NOVAMENTE." 
        });
      } catch (migrationError) {
        console.error("Erro na migração automática:", migrationError);
      }
    }

    return NextResponse.json({ 
      error: "Erro ao salvar no banco", 
      details: error?.message || String(error),
      code: error?.code
    }, { status: 500 });
  }
}
