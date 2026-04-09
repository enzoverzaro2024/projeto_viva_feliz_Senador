import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/settings";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao ler configurações" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    const body = await req.json();
    const updated = await saveSettings(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao salvar configurações" }, { status: 500 });
  }
}
