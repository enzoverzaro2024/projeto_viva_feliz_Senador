import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const result = await db.select({
      id: participants.id,
      name: participants.name,
      cardNumber: participants.cardNumber,
      currentBalance: participants.currentBalance,
    })
    .from(participants)
    .orderBy(desc(participants.currentBalance))
    .limit(20);

    return NextResponse.json({ participants: result });
  } catch (error: any) {
    console.error("Public ranking error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
