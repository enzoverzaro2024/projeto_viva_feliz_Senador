import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, sql } from "@/lib/db";
import { participants, users, transactions, attendance } from "@/lib/db/schema";
import { eq, desc, ilike, or, and, sql as drizzleSql, isNotNull } from "drizzle-orm";
import { nanoid } from "@/lib/utils";

export const dynamic = "force-dynamic";

// List all participants (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado", participants: [] }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado", participants: [] }, { status: 403 });
    }

    const url = new URL(req.url);
    const search = (url.searchParams.get("search") || "").trim();

    let result;
    if (search) {
      const pattern = `%${search}%`;
      result = await sql`
        SELECT * FROM participants
        WHERE name ILIKE ${pattern}
           OR email ILIKE ${pattern}
           OR card_id ILIKE ${pattern}
           OR card_number ILIKE ${pattern}
        ORDER BY created_at DESC
      `;
    } else {
      result = await sql`SELECT * FROM participants ORDER BY CAST(card_number AS INTEGER) ASC NULLS LAST, created_at DESC`;
    }

    // Map snake_case DB columns to camelCase for the frontend
    const mapped = result.map((p: any) => ({
      id: p.id,
      userId: p.user_id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      age: p.age,
      address: p.address,
      neighborhood: p.neighborhood,
      cardId: p.card_id,
      cardNumber: p.card_number,
      pin: p.pin,
      currentBalance: p.current_balance,
      processedResgate: p.processed_resgate,
      processedReforco: p.processed_reforco,
      resgateNote: p.resgate_note,
      reforcoNote: p.reforco_note,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    return NextResponse.json({ participants: mapped });
  } catch (error: any) {
    console.error("Admin list participants error:", error);
    return NextResponse.json({ error: "Erro interno: " + error.message, participants: [] }, { status: 500 });
  }
}

// Delete a participant (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { participantId } = await req.json();
    if (!participantId) {
      return NextResponse.json({ error: "ID do participante obrigatório" }, { status: 400 });
    }

    // Delete related transactions first
    await db.delete(transactions).where(eq(transactions.participantId, participantId));
    // Delete attendance records
    await db.delete(attendance).where(eq(attendance.participantId, participantId));
    // Delete participant
    await db.delete(participants).where(eq(participants.id, participantId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin delete participant error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// Update a participant (admin only)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await req.json();
    const {
      participantId, name, email, phone, age, address, neighborhood,
      currentBalance, cardNumber, pin,
      processedResgate, processedReforco,
      resgateNote, reforcoNote,
      resetAllProcessed,
      lockResgate, lockReforco,
      newCardId, newCardNumber
    } = body;
    
    if (!participantId && !resetAllProcessed) {
      return NextResponse.json({ error: "ID do participante obrigatório" }, { status: 400 });
    }

    // Lógica de Trava (Lock) para evitar envios duplicados
    if (lockResgate && participantId) {
      const p = await db.select({ status: participants.processedResgate }).from(participants).where(eq(participants.id, participantId)).limit(1);
      if (p.length > 0 && p[0].status !== 0) {
        return NextResponse.json({ error: "locked", message: "Já tem alguém enviando para esse contato!" }, { status: 409 });
      }
      await db.update(participants).set({ processedResgate: 5, updatedAt: new Date() }).where(eq(participants.id, participantId));
      return NextResponse.json({ success: true, message: "Bloqueado para envio" });
    }

    if (lockReforco && participantId) {
      const p = await db.select({ status: participants.processedReforco }).from(participants).where(eq(participants.id, participantId)).limit(1);
      if (p.length > 0 && p[0].status !== 0) {
        return NextResponse.json({ error: "locked", message: "Já tem alguém enviando para esse contato!" }, { status: 409 });
      }
      await db.update(participants).set({ processedReforco: 5, updatedAt: new Date() }).where(eq(participants.id, participantId));
      return NextResponse.json({ success: true, message: "Bloqueado para envio" });
    }

    // Lógica para resetar todos (para o início de uma nova missão)
    if (resetAllProcessed === "resgate") {
      await db.update(participants).set({ processedResgate: 0, resgateNote: null }).where(isNotNull(participants.id));
      return NextResponse.json({ success: true, message: "Resgate resetado" });
    }
    if (resetAllProcessed === "reforco") {
      await db.update(participants).set({ processedReforco: 0, reforcoNote: null }).where(isNotNull(participants.id));
      return NextResponse.json({ success: true, message: "Reforço resetado" });
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };

    // Lógica de Troca de Cartão (Transfer)
    if (newCardId && participantId) {
      // 1. Verifica conflito de ID (QR)
      const isIdTaken = await db.select().from(participants).where(eq(participants.cardId, newCardId)).limit(1);
      if (isIdTaken.length > 0 && isIdTaken[0].id !== participantId) {
        const pTaken = isIdTaken[0];
        const isGeneric = pTaken.name === "" || pTaken.name.startsWith("Cartão #");
        const hasNoBalance = parseFloat(pTaken.currentBalance) === 0;

        if (isGeneric && hasNoBalance) {
          // É um cartão extra. Removemos o placeholder para liberar o ID.
          await db.delete(participants).where(eq(participants.id, pTaken.id));
        } else {
          return NextResponse.json({ error: `Este ID de QR Code já está em uso por "${pTaken.name}"!` }, { status: 400 });
        }
      }

      // 2. Verifica conflito de Número (000)
      if (newCardNumber) {
        const paddedNum = String(newCardNumber).padStart(3, "0");
        const isNumTaken = await db.select().from(participants).where(eq(participants.cardNumber, paddedNum)).limit(1);
        if (isNumTaken.length > 0 && isNumTaken[0].id !== participantId) {
          const pTaken = isNumTaken[0];
          const isGeneric = pTaken.name === "" || pTaken.name.startsWith("Cartão #");
          const hasNoBalance = parseFloat(pTaken.currentBalance) === 0;

          if (isGeneric && hasNoBalance) {
            await db.delete(participants).where(eq(participants.id, pTaken.id));
          } else {
            return NextResponse.json({ error: `Este número de cartão (${paddedNum}) já está em uso por "${pTaken.name}"!` }, { status: 400 });
          }
        }
        updateData.cardNumber = paddedNum;
      }
      
      updateData.cardId = newCardId;
    }

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (age !== undefined) updateData.age = age;
    if (address !== undefined) updateData.address = address;
    if (neighborhood !== undefined) updateData.neighborhood = neighborhood;
    if (cardNumber !== undefined) updateData.cardNumber = cardNumber; 
    if (pin !== undefined) updateData.pin = pin ? pin.trim() : null;
    
    if (currentBalance !== undefined && currentBalance !== null && currentBalance !== "") {
      const parsed = parseFloat(currentBalance.toString().replace(',', '.'));
      if (!isNaN(parsed)) updateData.currentBalance = parsed.toFixed(2);
    }
    
    // Aceita valor numérico direto: 0=pendente, 1=enviado, 2=falhou
    if (processedResgate !== undefined) updateData.processedResgate = Number(processedResgate);
    if (processedReforco !== undefined) updateData.processedReforco = Number(processedReforco);
    if (resgateNote !== undefined) updateData.resgateNote = resgateNote || null;
    if (reforcoNote !== undefined) updateData.reforcoNote = reforcoNote || null;

    await db.update(participants)
      .set(updateData)
      .where(eq(participants.id, participantId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin update participant error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// Create a new participant (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, age, address, neighborhood, cardNumber } = body;

    if (!name) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const paddedCardNumber = cardNumber ? String(cardNumber).padStart(3, "0") : null;

    if (paddedCardNumber) {
      const isCardTaken = await db.select().from(participants).where(eq(participants.cardNumber, paddedCardNumber)).limit(1);
      
      if (isCardTaken.length > 0) {
        const owner = isCardTaken[0];
        
        // Se o usuário confirmou sobrescrever, atualizamos os dados básicos mantendo o saldo
        if (body.overwrite) {
          const updated = await db.update(participants)
            .set({
              name: name.trim(),
              email: email || owner.email,
              phone: phone || owner.phone,
              age: age || owner.age,
              address: address || owner.address,
              neighborhood: neighborhood || owner.neighborhood,
              updatedAt: new Date()
            })
            .where(eq(participants.id, owner.id))
            .returning();
            
          return NextResponse.json({ 
            success: true, 
            participant: updated[0], 
            message: `Dados de "${owner.name}" foram atualizados. Saldo preservado.` 
          });
        }

        // Caso contrário, retorna erro customizado para o frontend perguntar ao usuário
        return NextResponse.json({ 
          error: "duplicated", 
          message: `Este número de cartão já está cadastrado em nome de: ${owner.name}.`
        }, { status: 400 });
      }
    }

    const cardId = paddedCardNumber ? `EC-${paddedCardNumber}-${nanoid(6).toUpperCase()}` : nanoid(16);

    const result = await db.insert(participants).values({
      userId: session.userId,
      name: name.trim(),
      email: email || `${name.toLowerCase().replace(/\s/g, '.')}@evento.local`,
      phone: phone || "---",
      age: age || null,
      address: address || null,
      neighborhood: neighborhood || null,
      cardId: cardId,
      cardNumber: paddedCardNumber,
      currentBalance: "0.00",
    }).returning();

    return NextResponse.json({ success: true, participant: result[0] });
  } catch (error: any) {
    console.error("Admin create participant error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
