import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants, users } from "@/lib/db/schema";
import { eq, ilike, or, desc, isNotNull, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import postgres from "postgres";

export const maxDuration = 30;

// POST: Generate a batch of pre-printed cards
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Não autenticado ou sem permissão" }, { status: 401 });
    }

    const { quantity, specificNumber } = await req.json();

    // Ensure valid admin user ID in DB
    let adminUserId = session.userId;
    const userCheck = await db.select({ id: users.id }).from(users).where(eq(users.id, adminUserId)).limit(1);
    if (userCheck.length === 0) {
      // Fallback to first available admin
      const anyAdmin = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
      if (anyAdmin.length > 0) adminUserId = anyAdmin[0].id;
    }

    if (specificNumber) {
      const paddedSpecific = String(specificNumber).padStart(3, "0");
      
      const conflict = await db.select()
        .from(participants)
        .where(eq(participants.cardNumber, paddedSpecific))
        .limit(1);

      if (conflict.length > 0) {
        const owner = conflict[0];
        const isGeneric = owner.name === "" || owner.name.startsWith("Cartão #");
        const hasNoBalance = parseFloat(owner.currentBalance) === 0;

        if (isGeneric && hasNoBalance) {
          return NextResponse.json({
            success: true,
            message: `Cartão ${paddedSpecific} já existe em branco e foi recuperado!`,
            cards: [{ num: paddedSpecific, cardId: owner.cardId, name: `Cartão #${paddedSpecific}`, cardNumber: paddedSpecific }]
          });
        }

        return NextResponse.json({ 
          error: `O cartão ${paddedSpecific} já pertence a "${owner.name}".` 
        }, { status: 400 });
      }

      const cardId = `EC-${paddedSpecific}-${randomUUID().slice(0, 6).toUpperCase()}`;
      const uniqueEmail = `cartao${paddedSpecific}-${randomUUID().slice(0, 4).toLowerCase()}@evento.local`;

      await db.insert(participants).values({
        userId: adminUserId,
        name: "",
        email: uniqueEmail,
        phone: "---",
        cardId,
        cardNumber: paddedSpecific,
        currentBalance: "0",
      });

      return NextResponse.json({
        success: true,
        message: `Cartão ${paddedSpecific} gerado com sucesso!`,
        cards: [{ num: paddedSpecific, cardId, name: `Cartão #${paddedSpecific}`, cardNumber: paddedSpecific }]
      });
    }

    const qty = Math.min(Math.max(parseInt(quantity) || 10, 1), 500);

    // Fetch existing card numbers to find the highest number
    const existing = await db.select({ cardNumber: participants.cardNumber })
      .from(participants)
      .where(isNotNull(participants.cardNumber));

    const takenNumbersSet = new Set<number>();
    let maxNum = 0;
    for (const p of existing) {
      if (p.cardNumber) {
        const parsed = parseInt(p.cardNumber, 10);
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

      allToInsert.push({
        user_id: adminUserId,
        name: "",
        email: uniqueEmail,
        phone: "---",
        card_id: cardId,
        card_number: padded,
        current_balance: "0",
      });

      takenNumbersSet.add(currentNum);
      created.push({ num: padded, cardId, name: `Cartão #${padded}`, cardNumber: padded });
      currentNum++;
    }

    // Insert in chunks of 50 to prevent parameter limits in Postgres/Neon
    if (allToInsert.length > 0) {
      const conn = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
      const sql = postgres(conn, { ssl: "require", max: 5 });

      const chunkSize = 50;
      for (let i = 0; i < allToInsert.length; i += chunkSize) {
        const chunk = allToInsert.slice(i, i + chunkSize);
        await sql`
          INSERT INTO participants ${sql(chunk, 'user_id', 'name', 'email', 'phone', 'card_id', 'card_number', 'current_balance')}
        `;
      }
      await sql.end();
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
