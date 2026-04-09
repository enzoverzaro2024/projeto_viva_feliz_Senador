import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { participants, attendance, users, transactions, eventSettings } from "@/lib/db/schema";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Autenticação oficial do Vercel Cron
  // O Vercel injeta esse cabeçalho usando o CRON_SECRET nas variáveis de ambiente.
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET && 
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Acesso Negado: Chave Cron inválida." }, { status: 401 });
  }

  try {
    // 1. Coleta e Organiza os dados das tabelas
    const allParticipants = await db.select().from(participants);
    const allAttendance = await db.select().from(attendance);
    const allUsers = await db.select().from(users);
    const allSettings = await db.select().from(eventSettings);
    
    // Converte e embeleza em JSON
    const backupData = {
      geradoEm: new Date().toISOString(),
      estatisticas: {
        total_participantes: allParticipants.length,
        total_presencas: allAttendance.length,
      },
      tabelas: {
        configuracoes_evento: allSettings,
        membros_equipe: allUsers,
        participantes: allParticipants,
        registro_de_presencas: allAttendance,
      }
    };
    
    const buffer = Buffer.from(JSON.stringify(backupData, null, 2));
    const dataAtualString = new Date().toLocaleDateString('pt-BR');

    // 2. Se as variáveis não estiverem preenchidas, cancela para não dar crash na build
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return NextResponse.json({ 
        error: "Credenciais de e-mail ausentes no .env. Variáveis necessárias: EMAIL_USER, EMAIL_PASS" 
      }, { status: 500 });
    }

    // 3. Monta o carteiro digital (Nodemailer configurado para Gmail ou SMTP genérico)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 4. Envia o e-mail anexando o banco
    await transporter.sendMail({
      from: `"Backup EventCard" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO || process.env.EMAIL_USER, // se não definir EMAIL_TO, ele manda pra ele mesmo
      subject: `📦 Backup Automático EventCard - ${dataAtualString}`,
      text: `Olá!\n\nSegue em anexo o arquivo de backup unificado de todas as tabelas do projeto EventCard.\nGerado de forma automatizada no dia ${dataAtualString}.\n\nGuarde este arquivo em segurança.\n\nSistema EventCard.`,
      attachments: [
        {
          filename: `backup-eventcard-${new Date().toISOString().split('T')[0]}.json`,
          content: buffer
        }
      ]
    });

    return NextResponse.json({ success: true, message: "Backup gerado e enviado com sucesso!" });
  } catch (error: any) {
    console.error("Erro no Cron de Backup:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
