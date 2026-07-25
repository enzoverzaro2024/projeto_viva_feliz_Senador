"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Heart, LogOut, History, Download, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";

interface ParticipantData {
  id: number;
  name: string;
  email: string;
  phone: string;
  cardId: string;
  currentBalance: string;
  createdAt: string;
}

interface TransactionData {
  id: number;
  amount: string;
  description: string | null;
  createdAt: string;
}

export default function ParticipantCard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [participant, setParticipant] = useState<ParticipantData | null>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [eventInfo, setEventInfo] = useState({ 
    projectName: "",
    prevSummary: "", 
    prizesList: "",
    nextChallenge: "", 
    tonightPoints: "" 
  });
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCard();
    fetchEventInfo();
  }, []);

  const fetchEventInfo = async () => {
    try {
      const res = await fetch("/api/admin/settings/event");
      const data = await res.json();
      if (data.eventInfo) setEventInfo(data.eventInfo);
    } catch { console.error("Erro ao carregar informativo"); }
  };

  const fetchCard = async () => {
    try {
      const res = await fetch("/api/participants");
      const data = await res.json();
      setParticipant(data.participant);
    } catch {
      toast.error("Erro ao carregar cartão");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/participants/transactions");
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch {
      toast.error("Erro ao carregar histórico");
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    if (!showHistory) fetchHistory();
    setShowHistory(!showHistory);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const downloadQRCode = () => {
    if (qrRef.current) {
      const canvas = qrRef.current.querySelector("canvas");
      if (canvas) {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `cartao-${participant?.cardId}.png`;
        link.click();
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-main flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="min-h-screen bg-gradient-main">
        <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="container p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-8 h-8 text-accent fill-accent" />
              <h1 className="text-xl md:text-2xl font-bold m-0 font-playfair">Viva Feliz</h1>
            </div>
            <button onClick={handleLogout} className="btn-secondary px-4 py-2 text-sm">Sair</button>
          </div>
        </header>
        <div className="container px-4 py-16 text-center max-w-md mx-auto flex flex-col items-center">
          <h2 className="text-2xl font-playfair font-bold mb-4">Cartão não encontrado</h2>
          <p className="text-muted-foreground mb-8">
            Você ainda não registrou um cartão. Clique abaixo para criar um.
          </p>
          <button onClick={() => router.push("/participante/registro")} className="btn-primary w-full sm:w-auto px-8 py-3.5">
            Criar Cartão Agora
          </button>
        </div>
      </div>
    );
  }

  const balance = parseFloat(participant.currentBalance);

  return (
    <div className="min-h-screen bg-gradient-main">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="container p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-8 h-8 text-accent fill-accent" />
            <h1 className="text-xl md:text-2xl font-bold m-0 font-playfair">Viva Feliz</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleHistory} className="btn-secondary flex items-center gap-2 p-2 px-3 md:px-4 text-sm">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
            </button>
            <button onClick={handleLogout} className="btn-secondary p-2 px-3 md:px-4" aria-label="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container px-4 py-8 md:py-12">
        <div className="max-w-xl mx-auto space-y-6">
          
          {/* Daily Mission Info */}
          {(eventInfo.prevSummary || eventInfo.nextChallenge || eventInfo.prizesList || eventInfo.tonightPoints) && (
            <div className="card-elegant animate-fade-in bg-gradient-accent text-white border-none p-6 shadow-xl relative overflow-hidden">
               <div style={{ position: 'absolute', right: '-10%', top: '-10%', opacity: 0.1 }}>
                <Heart size={120} fill="white" />
              </div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-white/20 p-1.5 rounded-lg">✨</span> 
                Informativo: {eventInfo.projectName}
              </h3>
              
              {eventInfo.prevSummary && (
                <div className="mb-4 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/5">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">📝 Resumo da Última Noite</p>
                  <p className="text-sm leading-relaxed">{eventInfo.prevSummary}</p>
                </div>
              )}

              {eventInfo.prizesList && (
                <div className="mb-4 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/5">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">🎁 Prêmios em Jogo</p>
                  <p className="text-sm leading-relaxed whitespace-pre-line">{eventInfo.prizesList}</p>
                </div>
              )}

              {eventInfo.tonightPoints && (
                <div className="mb-4 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/5">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">🏆 Regras de Pontuação</p>
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-line">{eventInfo.tonightPoints}</p>
                </div>
              )}

              {eventInfo.nextChallenge && (
                <div className="bg-amber-400 text-amber-950 p-4 rounded-xl shadow-inner flex items-start gap-3">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Desafio de Hoje</p>
                    <p className="font-bold leading-tight whitespace-pre-line">{eventInfo.nextChallenge}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card Display */}
          <div className="card-elegant animate-fade-in bg-gradient-to-br from-card to-indigo-50/30 border-indigo-100 p-6 md:p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-playfair font-bold mb-2">Seu Cartão de Pontos</h2>
              <p className="text-muted-foreground text-sm md:text-base">Apresente este QR Code para validar suas missões</p>
            </div>

            {/* QR Code */}
            <div 
              ref={qrRef} 
              className="flex justify-center mb-8 p-4 md:p-6 bg-white rounded-2xl border-2 border-indigo-100 shadow-sm mx-auto w-fit"
            >
              <QRCodeCanvas value={participant.cardId} size={220} level="H" includeMargin={true} />
            </div>

            {/* Balance Display - Moved up for better visibility on mobile */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-50/50 rounded-xl p-5 mb-6 border border-indigo-100 text-center shadow-sm">
              <p className="text-sm font-medium text-muted-foreground mb-1">Pontuação Total</p>
              <p className="text-4xl md:text-5xl font-bold text-accent font-inter tracking-tight">
                {balance.toFixed(0)} pts
              </p>
            </div>

            {/* Card Info */}
            <div className="bg-white/50 rounded-xl p-5 mb-6 border border-border backdrop-blur-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Nome</p>
                  <p className="font-semibold text-base text-foreground break-words">{participant.name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">ID do Cartão</p>
                  <p className="font-semibold text-base font-mono bg-muted px-2 py-0.5 rounded w-fit">{participant.cardId}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                  <p className="font-semibold text-sm md:text-base text-foreground break-all">{participant.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Telefone</p>
                  <p className="font-semibold text-base text-foreground">{participant.phone}</p>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <button onClick={downloadQRCode} className="btn-primary w-full py-3.5 text-base flex justify-center shadow-md">
              <Download className="w-5 h-5" />
              Salvar Cartão no Celular
            </button>
          </div>

          {/* History Section */}
          {showHistory && (
            <div className="card-elegant animate-fade-in p-6">
              <h3 className="text-xl md:text-2xl font-playfair font-bold mb-6">Histórico de Missões</h3>

              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                </div>
              ) : transactions.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {transactions.map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-border hover:border-indigo-200 transition-colors shadow-sm">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-semibold text-sm md:text-base text-foreground truncate mb-1">
                          {txn.description || "Missão Concluída"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(txn.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <p className="text-lg md:text-xl font-bold text-accent shrink-0">
                        + {parseFloat(txn.amount).toFixed(0)} pts
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-muted/30 rounded-xl border border-dashed border-border">
                  <p className="text-muted-foreground text-sm">Nenhuma transação registrada ainda.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
