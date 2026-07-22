import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import { eq, ilike, or, desc, isNotNull, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

// POST: Generate a batch of pre-printed cards
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { quantity, prefix, specificNumber } = await req.json();

    if (specificNumber) {
      const paddedSpecific = String(specificNumber).padStart(3, "0");
      
      // Check if it already exists
      const conflict = await db.select()
        .from(participants)
        .where(eq(participants.cardNumber, paddedSpecific))
        .limit(1);

      if (conflict.length > 0) {
        return NextResponse.json({ 
          error: `O cartão ${paddedSpecific} já existe e pertence a ${conflict[0].name || 'um cadastro em branco'}.` 
        }, { status: 400 });
      }

      const cardId = `EC-${paddedSpecific}-${randomUUID().slice(0, 6).toUpperCase()}`;
      await db.insert(participants).values({
        userId: session.userId,
        name: "",
        email: `cartao${paddedSpecific}@evento.local`,
        phone: "---",
        cardId,
        cardNumber: paddedSpecific,
        currentBalance: "0",
      });

      return NextResponse.json({
        success: true,
        message: `Cartão ${paddedSpecific} restaurado com sucesso!`,
        cards: [{ num: paddedSpecific, cardId, name: `Cartão #${paddedSpecific}`, cardNumber: paddedSpecific }]
      });
    }

    const qty = Math.min(Math.max(parseInt(quantity) || 10, 1), 200);
    const pfx = prefix || "Cartão";

    // Find the highest existing card number to continue from
    const existing = await db.select({ cardNumber: participants.cardNumber })
      .from(participants)
      .where(isNotNull(participants.cardNumber));

    let maxNum = 0;
    for (const p of existing) {
      if (p.cardNumber) {
        maxNum = Math.max(maxNum, parseInt(p.cardNumber));
      }
    }

    const created = [];
    for (let i = 1; i <= qty; i++) {
      const num = maxNum + i;
      const padded = String(num).padStart(3, "0");
      const cardId = `EC-${padded}-${randomUUID().slice(0, 6).toUpperCase()}`;

      await db.insert(participants).values({
        userId: session.userId,
        name: "",
        email: `cartao${padded}@evento.local`,
        phone: "---",
        cardId,
        cardNumber: padded,
        currentBalance: "0",
      });

      created.push({ num: padded, cardId, name: `Cartão #${padded}`, cardNumber: padded });
    }

    return NextResponse.json({
      success: true,
      message: `${qty} cartões gerados com sucesso!`,
      cards: created,
    });
  } catch (error: any) {
    console.error("Batch cards error:", error);
    return NextResponse.json({ error: "Erro interno: " + error.message }, { status: 500 });
  }
}

// GET: List unassigned cards (names starting with prefix)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const url = new URL(req.url);
    const showAll = url.searchParams.get("all") === "true";
    const search = url.searchParams.get("search") || "";

    let result;
    if (search) {
      result = await db.select().from(participants)
        .where(
          or(
            ilike(participants.name, `%${search}%`),
            ilike(participants.cardId, `%${search}%`)
          )
        )
        .orderBy(desc(participants.createdAt));
    } else if (!showAll) {
      // Show only unassigned (cards with empty names OR generic card names with 0 balance)
      result = await db.select().from(participants)
        .where(
          or(
            eq(participants.name, ""),
            and(
              ilike(participants.name, "Cartão #%"),
              or(
                eq(participants.currentBalance, "0"),
                eq(participants.currentBalance, "0.00")
              )
            )
          )
        )
        .orderBy(desc(participants.createdAt));
    } else {
      result = await db.select().from(participants)
        .orderBy(desc(participants.createdAt));
    }

    return NextResponse.json({ cards: result });
  } catch (error: any) {
    console.error("Batch cards list error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
