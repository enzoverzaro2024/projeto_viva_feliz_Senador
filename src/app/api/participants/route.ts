import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import { eq, ilike } from "drizzle-orm";
import { nanoid } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { name, email, phone, age, address, neighborhood } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    // Check if name already exists
    const nameExists = await db.select().from(participants)
      .where(ilike(participants.name, name)).limit(1);
    
    if (nameExists.length > 0) {
      return NextResponse.json(
        { error: "Já existe um participante com este nome." },
        { status: 400 }
      );
    }

    // Check if user already has a participant card
    const existing = await db.select().from(participants)
      .where(eq(participants.userId, session.userId)).limit(1);
    
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Você já possui um cartão cadastrado" },
        { status: 409 }
      );
    }

    const cardId = nanoid(16);

    const result = await db.insert(participants).values({
      userId: session.userId,
      name,
      email: email || `${name.toLowerCase().replace(/\s/g, '.')}@evento.local`,
      phone: phone || "---",
      age: age || null,
      address: address || null,
      neighborhood: neighborhood || null,
      cardId,
    }).returning();

    return NextResponse.json({ participant: result[0] });
  } catch (error: any) {
    console.error("Register participant error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const whereClause = session.role === "participant" 
      ? eq(participants.id, session.userId) 
      : eq(participants.userId, session.userId);

    const result = await db.select().from(participants)
      .where(whereClause).limit(1);

    if (result.length === 0) {
      return NextResponse.json({ participant: null });
    }

    return NextResponse.json({ participant: result[0] });
  } catch (error: any) {
    console.error("Get participant error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
