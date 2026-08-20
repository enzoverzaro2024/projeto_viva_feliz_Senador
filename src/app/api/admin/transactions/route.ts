import { db } from "@/lib/db";
import { transactions, participants, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// GET: List all transactions with participant and volunteer details
export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "volunteer")) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const list = await db
      .select({
        id: transactions.id,
        participantId: transactions.participantId,
        volunteerId: transactions.volunteerId,
        amount: transactions.amount,
        description: transactions.description,
        createdAt: transactions.createdAt,
        participantName: participants.name,
        cardNumber: participants.cardNumber,
        volunteerName: users.name,
        volunteerEmail: users.email,
      })
      .from(transactions)
      .leftJoin(participants, eq(transactions.participantId, participants.id))
      .leftJoin(users, eq(transactions.volunteerId, users.id))
      .orderBy(desc(transactions.createdAt));

    return NextResponse.json({ transactions: list });
  } catch (err) {
    console.error("Error fetching transactions:", err);
    return NextResponse.json({ error: "Erro ao buscar histórico de transações" }, { status: 500 });
  }
}

// POST: Create a new operation (Credit or Debit)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { participantId, amount, description, type } = body;

    if (!participantId || !amount) {
      return NextResponse.json({ error: "Consumidor e valor são obrigatórios" }, { status: 400 });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount === 0) {
      return NextResponse.json({ error: "Informe um valor válido diferente de zero" }, { status: 400 });
    }

    // Type option: 'credit' (+ amount) or 'debit' (- amount)
    const finalAmount = type === "debit" ? -Math.abs(numericAmount) : (type === "credit" ? Math.abs(numericAmount) : numericAmount);

    const targetParticipant = await db.select().from(participants).where(eq(participants.id, Number(participantId))).limit(1);
    if (targetParticipant.length === 0) {
      return NextResponse.json({ error: "Comprador / Cartão não encontrado" }, { status: 404 });
    }

    const currentBal = parseFloat(targetParticipant[0].currentBalance);
    const newBal = currentBal + finalAmount;

    if (newBal < 0) {
      return NextResponse.json({ error: "Saldo insuficiente no cartão para esta operação de débito" }, { status: 400 });
    }

    // Insert transaction
    const [inserted] = await db.insert(transactions).values({
      participantId: Number(participantId),
      volunteerId: session.userId,
      amount: finalAmount.toString(),
      description: description || (finalAmount > 0 ? "Recarga manual na tesouraria" : "Venda / Débito manual"),
    }).returning();

    // Update participant balance
    await db.update(participants)
      .set({ currentBalance: newBal.toFixed(2), updatedAt: new Date() })
      .where(eq(participants.id, Number(participantId)));

    return NextResponse.json({
      success: true,
      transaction: inserted,
      newBalance: newBal.toFixed(2),
      message: "Operação criada com sucesso!",
    });
  } catch (err: any) {
    console.error("Error creating transaction:", err);
    return NextResponse.json({ error: "Erro ao criar operação" }, { status: 500 });
  }
}

// PATCH: Edit an existing operation
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { transactionId, amount, description, participantId } = body;

    if (!transactionId) {
      return NextResponse.json({ error: "ID da operação obrigatório" }, { status: 400 });
    }

    const existing = await db.select().from(transactions).where(eq(transactions.id, Number(transactionId))).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: "Operação não encontrada" }, { status: 404 });
    }

    const oldTx = existing[0];
    const oldAmount = parseFloat(oldTx.amount);
    const oldParticipantId = oldTx.participantId;

    const newAmount = amount !== undefined ? parseFloat(amount) : oldAmount;
    const newParticipantId = participantId !== undefined ? Number(participantId) : oldParticipantId;

    if (isNaN(newAmount)) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
    }

    // Case 1: Same participant, update balance difference
    if (oldParticipantId === newParticipantId) {
      const diff = newAmount - oldAmount;
      const targetP = await db.select().from(participants).where(eq(participants.id, oldParticipantId)).limit(1);

      if (targetP.length > 0) {
        const curBal = parseFloat(targetP[0].currentBalance);
        const updatedBal = curBal + diff;

        await db.update(participants)
          .set({ currentBalance: updatedBal.toFixed(2), updatedAt: new Date() })
          .where(eq(participants.id, oldParticipantId));
      }
    } else {
      // Case 2: Participant changed, revert old participant balance and apply new amount to new participant
      const oldP = await db.select().from(participants).where(eq(participants.id, oldParticipantId)).limit(1);
      if (oldP.length > 0) {
        const revertedBal = parseFloat(oldP[0].currentBalance) - oldAmount;
        await db.update(participants)
          .set({ currentBalance: revertedBal.toFixed(2), updatedAt: new Date() })
          .where(eq(participants.id, oldParticipantId));
      }

      const newP = await db.select().from(participants).where(eq(participants.id, newParticipantId)).limit(1);
      if (newP.length > 0) {
        const appliedBal = parseFloat(newP[0].currentBalance) + newAmount;
        await db.update(participants)
          .set({ currentBalance: appliedBal.toFixed(2), updatedAt: new Date() })
          .where(eq(participants.id, newParticipantId));
      }
    }

    // Update transaction record
    const [updated] = await db.update(transactions)
      .set({
        amount: newAmount.toString(),
        description: description !== undefined ? description : oldTx.description,
        participantId: newParticipantId,
      })
      .where(eq(transactions.id, Number(transactionId)))
      .returning();

    return NextResponse.json({
      success: true,
      transaction: updated,
      message: "Operação atualizada com sucesso!",
    });
  } catch (err: any) {
    console.error("Error updating transaction:", err);
    return NextResponse.json({ error: "Erro ao atualizar operação" }, { status: 500 });
  }
}

// DELETE: Cancel/delete an operation and revert participant balance
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const { transactionId } = await req.json();

    if (!transactionId) {
      return NextResponse.json({ error: "ID da operação obrigatório" }, { status: 400 });
    }

    const existing = await db.select().from(transactions).where(eq(transactions.id, Number(transactionId))).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: "Operação não encontrada" }, { status: 404 });
    }

    const tx = existing[0];
    const amountVal = parseFloat(tx.amount);

    // Revert balance on participant
    const p = await db.select().from(participants).where(eq(participants.id, tx.participantId)).limit(1);
    if (p.length > 0) {
      const revertedBal = parseFloat(p[0].currentBalance) - amountVal;
      await db.update(participants)
        .set({ currentBalance: revertedBal.toFixed(2), updatedAt: new Date() })
        .where(eq(participants.id, tx.participantId));
    }

    // Delete transaction record
    await db.delete(transactions).where(eq(transactions.id, Number(transactionId)));

    return NextResponse.json({
      success: true,
      message: "Operação excluída e saldo estornado com sucesso!",
    });
  } catch (err: any) {
    console.error("Error deleting transaction:", err);
    return NextResponse.json({ error: "Erro ao excluir operação" }, { status: 500 });
  }
}
