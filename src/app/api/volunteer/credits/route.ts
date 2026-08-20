import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, participants, users, eventSettings } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (session.role !== "volunteer" && session.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas líderes/voluntários podem validar missões" },
        { status: 403 }
      );
    }

    const { participantId, amount, description, pin } = await req.json();

    if (!participantId || !amount) {
      return NextResponse.json(
        { error: "Consumidor e valor são obrigatórios" },
        { status: 400 }
      );
    }

    const amountRegex = /^-?\d+(\.\d{1,2})?$/;
    if (!amountRegex.test(amount)) {
      return NextResponse.json(
        { error: "Valor inválido" },
        { status: 400 }
      );
    }

    const amountFloat = parseFloat(amount);

    // Se for acréscimo de crédito (amount > 0) e o usuário não for Admin, bloquear
    if (amountFloat > 0 && session.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas a Tesouraria (Administrador) tem permissão para adicionar créditos ao cartão." },
        { status: 403 }
      );
    }

    // Check participant exists
    const participantRes = await db.select().from(participants)
      .where(eq(participants.id, participantId)).limit(1);

    if (participantRes.length === 0) {
      return NextResponse.json(
        { error: "Consumidor não encontrado" },
        { status: 404 }
      );
    }

    const participant = participantRes[0];

    // Verifica configuração global de exigência de PIN
    const settingsRes = await db.select({ pinRequired: eventSettings.pinRequired }).from(eventSettings).where(eq(eventSettings.id, 1)).limit(1);
    const pinRequired = settingsRes[0]?.pinRequired ?? 0;

    // Se for Operação de Débito (Venda nas Bancas), validar a Senha / PIN do Cartão APENAS se pinRequired=1
    if (amountFloat < 0 && pinRequired === 1) {
      if (participant.pin) {
        if (!pin || pin.trim() !== participant.pin.trim()) {
          return NextResponse.json(
            { error: "¡Contraseña/PIN de la tarjeta incorrecto! Verifique los 4 dígitos e intente nuevamente." },
            { status: 400 }
          );
        }
      } else {
        // Se o cartão não tem PIN cadastrado e o usuário forneceu um PIN de 4 dígitos, cadastrar agora!
        if (pin && pin.trim().length >= 4) {
          await db.update(participants)
            .set({ pin: pin.trim(), updatedAt: new Date() })
            .where(eq(participants.id, participantId));
        } else {
          return NextResponse.json(
            { error: "Esta tarjeta requiere registrar un PIN de 4 dígitos para realizar compras." },
            { status: 400 }
          );
        }
      }
    }

    // Fetch volunteer user details for booth name
    const volunteerUser = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    const volunteerName = volunteerUser[0]?.name || "Puesto";

    let finalDescription = description;
    if (amountFloat < 0) {
      if (!description || description === "Venta en el Puesto" || description === "Venda na Banca") {
        finalDescription = `Venta: ${volunteerName}`;
      } else if (!description.includes(volunteerName)) {
        finalDescription = `${description} — ${volunteerName}`;
      }
    } else {
      finalDescription = description || "Recarga de Crédito (Tesorería)";
    }

    // Create transaction
    const result = await db.insert(transactions).values({
      participantId,
      volunteerId: session.userId,
      amount,
      description: finalDescription,
    }).returning();

    // Update participant balance
    const currentBalance = parseFloat(participant.currentBalance);
    const newBalanceFloat = currentBalance + amountFloat;

    if (newBalanceFloat < 0) {
      return NextResponse.json(
        { error: "Saldo insuficiente para realizar esta operação" },
        { status: 400 }
      );
    }

    const newBalance = newBalanceFloat.toFixed(2);

    await db.update(participants)
      .set({ currentBalance: newBalance, updatedAt: new Date() })
      .where(eq(participants.id, participantId));

    return NextResponse.json({
      success: true,
      transaction: result[0],
      newBalance,
      message: "Operação realizada com sucesso",
    });
  } catch (error: any) {
    console.error("Add credits error:", error);
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

    if (session.role !== "volunteer" && session.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas voluntários podem visualizar histórico" },
        { status: 403 }
      );
    }

    const result = await db.select().from(transactions)
      .where(eq(transactions.volunteerId, session.userId))
      .orderBy(desc(transactions.createdAt));

    return NextResponse.json({ transactions: result });
  } catch (error: any) {
    console.error("Get volunteer transactions error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
