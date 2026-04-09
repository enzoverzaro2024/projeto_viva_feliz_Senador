import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import { eq, ilike } from "drizzle-orm";
import { nanoid } from "@/lib/utils";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { data } = await req.json(); // Array of parsed contacts

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "Nenhum dado recebido" }, { status: 400 });
    }

    let inserted = 0;
    let updated = 0;

    for (const row of data) {
      // Expecting columns: nome, email, telefone, cartao, saldo (ou similares)
      // Flexible column mapping
      const normalizeStr = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      let rawName = "", rawEmail = "", rawPhone = "", rawAge = "", rawAddress = "", rawNeighborhood = "", rawCardNumber = "", rawBalance = "";

      for (const [key, value] of Object.entries(row)) {
        if (!key || value === null || value === undefined) continue;
        const normKey = normalizeStr(key);
        const val = String(value).trim();

        if (normKey.includes("nome") || normKey.includes("name") || normKey.includes("participante") || normKey.includes("convidado")) rawName = val;
        else if (normKey.includes("email") || normKey.includes("e-mail") || normKey.includes("mail")) rawEmail = val;
        else if (normKey.includes("telefone") || normKey.includes("celular") || normKey.includes("phone") || normKey.includes("contato") || normKey.includes("cel")) rawPhone = val;
        else if (normKey.includes("idade") || normKey.includes("age") || normKey.includes("nascimento") || normKey.includes("anos")) rawAge = val;
        else if (normKey.includes("endereco") || normKey.includes("address") || normKey.includes("rua") || normKey.includes("logradouro") || normKey.includes("local")) rawAddress = val;
        else if (normKey.includes("bairro") || normKey.includes("neighborhood") || normKey.includes("distrito") || normKey.includes("setor")) rawNeighborhood = val;
        else if (normKey.includes("cartao") || normKey.includes("card") || normKey.includes("numero") || normKey.includes("id ")) rawCardNumber = val;
        else if (normKey.includes("saldo") || normKey.includes("credito") || normKey.includes("balance") || normKey.includes("valor")) rawBalance = val;
      }

      if (!rawName) continue; // Skip if we couldn't find a name column at all
      
      const email = rawEmail || `${rawName.toLowerCase().replace(/\s/g, '.')}@evento.local`;
      const phone = rawPhone || "---";
      const age = rawAge || null;
      const address = rawAddress || null;
      const neighborhood = rawNeighborhood || null;
      const cardNumber = rawCardNumber || null;
      const paddedCardNumber = cardNumber ? String(cardNumber).padStart(3, "0") : null;
      
      let balance = String(rawBalance || "0").replace("R$", "").replace(",", ".").trim();
      let hasBalance = false;
      if (!isNaN(parseFloat(balance)) && rawBalance.trim() !== "") {
        hasBalance = true; // Só considero update no saldo se o usuário explicitamente colocou saldo na planilha
      } else {
        balance = "0";
      }

      let existing = null;

      // 1. Procurar SEMPRE pelo Nome de forma exata (ignora maiúsculas/minúsculas)
      const matchByName = await db.select().from(participants)
        .where(ilike(participants.name, rawName.trim())).limit(1);
      
      if (matchByName.length > 0) {
        existing = matchByName[0];
      }

      if (existing) {
        // Modo Seguro: Atualiza apenas dados de contato. NUNCA zera pontos. NUNCA rouba cartão dos outros.
        const updatePayload: any = {
          email: email,
          phone: phone,
        };
        if (age !== null) updatePayload.age = age;
        if (address !== null) updatePayload.address = address;
        if (neighborhood !== null) updatePayload.neighborhood = neighborhood;
        
        // Se a pessoa já tem um cartão no sistema, NUNCA sobrescreva pelo da planilha para evitar B.O.
        // Só preenche se a pessoa for "nova" (sem cartão).
        if (paddedCardNumber !== null && !existing.cardNumber) {
           // Verifica se o cartão novo que veio da planilha já não pertence a outra pessoa
           const isCardTaken = await db.select().from(participants).where(eq(participants.cardNumber, paddedCardNumber)).limit(1);
           if (isCardTaken.length === 0) {
             updatePayload.cardNumber = paddedCardNumber;
           }
        }

        // NUNCA MEXER NO SALDO DURANTE IMPORTAÇÃO.
        await db.update(participants).set(updatePayload).where(eq(participants.id, existing.id));
        updated++;
      } else {
        // Insert new
        const cardId = paddedCardNumber ? `EC-${paddedCardNumber}-${randomUUID().slice(0, 6).toUpperCase()}` : nanoid(16);

        await db.insert(participants).values({
          userId: session.userId,
          name: rawName.trim(),
          email: email,
          phone: phone,
          age: age ? String(age) : null,
          address: address ? String(address) : null,
          neighborhood: neighborhood ? String(neighborhood) : null,
          cardId: cardId,
          cardNumber: paddedCardNumber,
          currentBalance: parseFloat(balance).toFixed(2),
        });
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Importação concluída: ${inserted} criados, ${updated} atualizados.`,
    });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
