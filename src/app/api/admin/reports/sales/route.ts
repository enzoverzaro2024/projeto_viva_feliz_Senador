import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, users, participants } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Acesso não autorizado" }, { status: 403 });
    }

    // 1. Vendas por Banca/Voluntário (amount < 0)
    const salesByVolunteer = await db
      .select({
        volunteerId: transactions.volunteerId,
        volunteerName: users.name,
        volunteerEmail: users.email,
        totalSales: sql<string>`SUM(CASE WHEN CAST(${transactions.amount} AS NUMERIC) < 0 THEN ABS(CAST(${transactions.amount} AS NUMERIC)) ELSE 0 END)`,
        salesCount: sql<number>`COUNT(CASE WHEN CAST(${transactions.amount} AS NUMERIC) < 0 THEN 1 END)`,
        totalCreditsAdded: sql<string>`SUM(CASE WHEN CAST(${transactions.amount} AS NUMERIC) > 0 THEN CAST(${transactions.amount} AS NUMERIC) ELSE 0 END)`
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.volunteerId, users.id))
      .groupBy(transactions.volunteerId, users.name, users.email);

    // 2. Totais Gerais
    const totalCreditsRes = await db
      .select({
        totalTreasury: sql<string>`SUM(CASE WHEN CAST(${transactions.amount} AS NUMERIC) > 0 THEN CAST(${transactions.amount} AS NUMERIC) ELSE 0 END)`,
        totalSales: sql<string>`SUM(CASE WHEN CAST(${transactions.amount} AS NUMERIC) < 0 THEN ABS(CAST(${transactions.amount} AS NUMERIC)) ELSE 0 END)`
      })
      .from(transactions);

    // 3. Saldo Total nos Cartões dos Participantes
    const remainingBalanceRes = await db
      .select({
        totalBalance: sql<string>`SUM(CAST(${participants.currentBalance} AS NUMERIC))`
      })
      .from(participants);

    const totalTreasury = parseFloat(totalCreditsRes[0]?.totalTreasury || "0");
    const totalSales = parseFloat(totalCreditsRes[0]?.totalSales || "0");
    const totalRemaining = parseFloat(remainingBalanceRes[0]?.totalBalance || "0");

    return NextResponse.json({
      success: true,
      summary: {
        totalTreasury,
        totalSales,
        totalRemaining
      },
      bancas: salesByVolunteer.map((b) => ({
        volunteerId: b.volunteerId,
        name: b.volunteerName || "Sem Nome",
        email: b.volunteerEmail || "-",
        totalSales: parseFloat(b.totalSales || "0"),
        salesCount: Number(b.salesCount || 0),
        totalCreditsAdded: parseFloat(b.totalCreditsAdded || "0")
      }))
    });
  } catch (error: any) {
    console.error("Sales report error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar relatório de vendas" },
      { status: 500 }
    );
  }
}
