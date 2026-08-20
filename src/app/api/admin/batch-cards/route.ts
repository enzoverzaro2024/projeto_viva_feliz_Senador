import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, sql } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import { ilike, or, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export const maxDuration = 30;

// POST: Generate a batch of pre-printed cards
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Não autenticado ou sem permissão" }, { status: 401 });
    }

    const { quantity, specificNumber } = await req.json();

    // Verify admin user ID
    let adminUserId = session.userId;
    const [userExists] = await sql`SELECT id FROM users WHERE id = ${adminUserId} LIMIT 1`;
    if (!userExists) {
      const [anyAdmin] = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
      if (anyAdmin) adminUserId = anyAdmin.id;
    }

    if (specificNumber) {
      const paddedSpecific = String(specificNumber).padStart(3, "0");
      
      const [conflict] = await sql`SELECT id, name, current_balance, card_id FROM participants WHERE card_number = ${paddedSpecific} LIMIT 1`;

      if (conflict) {
        const isGeneric = conflict.name === "" || conflict.name.startsWith("Cartão #");
        const hasNoBalance = parseFloat(conflict.current_balance) === 0;

        if (isGeneric && hasNoBalance) {
          return NextResponse.json({
            success: true,
            message: `Cartão ${paddedSpecific} já existe em branco e foi recuperado!`,
            cards: [{ num: paddedSpecific, cardId: conflict.card_id, name: `Cartão #${paddedSpecific}`, cardNumber: paddedSpecific }]
          });
        }

        return NextResponse.json({ 
          error: `O cartão ${paddedSpecific} já pertence a "${conflict.name}".` 
        }, { status: 400 });
      }

      const cardId = `EC-${paddedSpecific}-${randomUUID().slice(0, 6).toUpperCase()}`;
      const uniqueEmail = `cartao${paddedSpecific}-${randomUUID().slice(0, 4).toLowerCase()}@evento.local`;

      await sql`
        INSERT INTO participants (user_id, name, email, phone, card_id, card_number, current_balance)
        VALUES (${adminUserId}, '', ${uniqueEmail}, '---', ${cardId}, ${paddedSpecific}, '0')
      `;

      return NextResponse.json({
        success: true,
        message: `Cartão ${paddedSpecific} gerado com sucesso!`,
        cards: [{ num: paddedSpecific, cardId, name: `Cartão #${paddedSpecific}`, cardNumber: paddedSpecific }]
      });
    }

    const qty = Math.min(Math.max(parseInt(quantity) || 10, 1), 500);

    // Fetch all existing card numbers
    const existingCards = await sql`SELECT card_number FROM participants WHERE card_number IS NOT NULL`;

    const takenNumbersSet = new Set<number>();
    let maxNum = 0;
    for (const p of existingCards) {
      if (p.card_number) {
        const parsed = parseInt(p.card_number, 10);
        if (!isNaN(parsed)) {
          takenNumbersSet.add(parsed);
          if (parsed > maxNum) maxNum = parsed;
        }
      }
    }

    const created = [];
    const allToInsert: any[] = [];
    let currentNum = maxNum + 1;

    while (created.length < qty) {
      if (takenNumbersSet.has(currentNum)) {
        currentNum++;
        continue;
      }

      const padded = String(currentNum).padStart(3, "0");
      const cardId = `EC-${padded}-${randomUUID().slice(0, 6).toUpperCase()}`;
      const uniqueEmail = `cartao${padded}-${randomUUID().slice(0, 4).toLowerCase()}@evento.local`;

      allToInsert.push([
        adminUserId,
        "",
        uniqueEmail,
        "---",
        cardId,
        padded,
        "0",
      ]);

      takenNumbersSet.add(currentNum);
      created.push({ num: padded, cardId, name: `Cartão #${padded}`, cardNumber: padded });
      currentNum++;
    }

    // Insert in chunks of 50 using native postgres bulk insert
    if (allToInsert.length > 0) {
      const chunkSize = 50;
      for (let i = 0; i < allToInsert.length; i += chunkSize) {
        const chunk = allToInsert.slice(i, i + chunkSize);
        await sql`
          INSERT INTO participants (user_id, name, email, phone, card_id, card_number, current_balance)
          VALUES ${sql(chunk)}
        `;
      }
    }

    return NextResponse.json({
      success: true,
      message: `¡${created.length} cartões gerados com sucesso!`,
      cards: created,
    });
  } catch (error: any) {
    console.error("Batch cards error:", error);
    return NextResponse.json({ error: "Erro ao gerar cartões: " + (error.message || "Erro de banco de dados") }, { status: 500 });
  }
}

// GET: List unassigned cards
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
      result = await db.select().from(participants)
        .where(
          or(
            ilike(participants.name, ""),
            ilike(participants.name, "Cartão #%")
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
