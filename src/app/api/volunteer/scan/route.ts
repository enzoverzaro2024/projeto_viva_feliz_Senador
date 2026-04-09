import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import { eq, or, ilike } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (session.role !== "volunteer" && session.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas voluntários podem escanear cartões" },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const q = url.searchParams.get("cardId"); // "q" pode ser cardId, cardNumber ou nome

    if (!q) {
      return NextResponse.json(
        { error: "ID, Nome ou Número de identificação é obrigatório" },
        { status: 400 }
      );
    }

    const result = await db.select().from(participants)
      .where(
        or(
          eq(participants.cardId, q),
          eq(participants.cardNumber, q),
          ilike(participants.name, `%${q}%`)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Cartão não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ participant: result[0] });
  } catch (error: any) {
    console.error("Scan card error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
