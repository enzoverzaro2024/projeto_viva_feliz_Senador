"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Heart, LogOut, Loader2, X, Check, Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface ScannedCard {
  id: number;
  name: string;
  email: string;
  phone: string;
  currentBalance: string;
  cardNumber: string;
}

interface Transaction {
  id: number;
  amount: string;
  description: string;
  createdAt: string;
}

export default function VolunteerScanner() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [scannedCard, setScannedCard] = useState<ScannedCard | null>(null);
  const [scannedTransactions, setScannedTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [manualCardId, setManualCardId] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [wantScanner, setWantScanner] = useState(false);
  const [auctionEnabled, setAuctionEnabled] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (!user || (user.role !== "volunteer" && user.role !== "admin")) {
      router.push("/");
      return;
    }

    const fetchSettings = async () => {
       try {
         const res = await fetch("/api/admin/settings/event");
         const data = await res.json();
         if (res.ok && data.eventInfo) {
           setAuctionEnabled(!!data.eventInfo.auctionEnabled);
         }
       } catch {}
    };
    fetchSettings();

    return () => {
      stopScanner();
    };
  }, [user]);

  // When wantScanner becomes true, the div is rendered.
  // This effect runs AFTER React renders, so the div exists.
  useEffect(() => {
    if (wantScanner && !scannerRef.current) {
      initScanner();
    }
  }, [wantScanner]);

  const startScanner = () => {
    setCameraError(null);
    setScannerActive(true);
    setWantScanner(true);
  };

  const initScanner = async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      const el = document.getElementById("qr-scanner");
      if (!el) {
        setCameraError("Elemento do scanner não encontrado. Recarregue a página.");
        return;
      }

      const scanner = new Html5Qrcode("qr-scanner");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText: string) => handleQRCodeScan(decodedText),
        () => {}
      );
    } catch (err: any) {
      console.error("Camera error:", err);
      const errStr = typeof err === "string" ? err : err?.message || "";
      if (errStr.includes("NotAllowed") || errStr.includes("Permission") || err?.name === "NotAllowedError") {
        setCameraError(
          "Acesso à câmera negado. No iPhone: vá em Ajustes → Safari → Câmera e selecione \"Permitir\". Depois recarregue esta página."
        );
      } else if (errStr.includes("NotFound") || err?.name === "NotFoundError") {
        setCameraError("Nenhuma câmera encontrada no dispositivo.");
      } else {
        setCameraError(`Erro ao acessar a câmera: ${errStr || "Verifique as permissões."}`);
      }
      setScannerActive(false);
      setWantScanner(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setScannerActive(false);
    setWantScanner(false);
  };

  const handleQRCodeScan = async (cardId: string) => {
    if (scannedCard) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/volunteer/scan?cardId=${encodeURIComponent(cardId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setScannedCard(data.participant);
      setScannedTransactions(data.transactions || []);
      stopScanner();
      toast.success("Cartão escaneado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao escanear cartão");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualScan = async () => {
    if (!manualCardId.trim()) {
      toast.error("Digite um ID de cartão válido");
      return;
    }
    await handleQRCodeScan(manualCardId.trim());
    setManualCardId("");
  };

  const submitCredits = async (amountToSubmit: string) => {
    if (!scannedCard || !amountToSubmit) {
      toast.error("Valor inválido");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/volunteer/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: scannedCard.id,
          amount: amountToSubmit,
          description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessDialog({ 
        show: true, 
        message: `${parseFloat(amountToSubmit).toFixed(0)} pontos processados com sucesso!`,
        balance: data.newBalance
      });
      setConfirmDialog({ show: false, amount: "" });
      if (scannedCard) {
        handleQRCodeScan(scannedCard.cardNumber || scannedCard.id.toString());
      }
      resetScan();
    } catch (error: any) {
      toast.error(error.message || "Erro ao lançar pontos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPoints = () => {
    if (!amount) {
      toast.error("Preencha a pontuação");
      return;
    }
    setConfirmDialog({ show: true, amount });
  };

  const handleQuickAdd = (value: number) => {
    const valStr = value.toString();
    setAmount(valStr);
    setConfirmDialog({ show: true, amount: valStr });
  };

  const resetScan = () => {
    setScannedCard(null);
    setScannedTransactions([]);
    setAmount("");
    setDescription("");
  };

  const handleAttendance = async () => {
    if (!scannedCard) return;

    try {
      setIsLoading(true);
      const res = await fetch("/api/volunteer/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: scannedCard.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message || "Presença registrada!");
      // Recarrega os dados do cartão para atualizar saldo (sem limpar a tela)
      handleQRCodeScan(scannedCard.cardNumber || scannedCard.id.toString());
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar presença");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const [debitAmount, setDebitAmount] = useState("");
  const [auctionItem, setAuctionItem] = useState("");
  const [lastBalance, setLastBalance] = useState<string | null>(null);

  const handleDebit = async () => {
    if (!scannedCard || !debitAmount) {
      toast.error("Informe o valor do lance");
      return;
    }

    const val = parseFloat(debitAmount);
    if (val <= 0) {
      toast.error("Informe um valor positivo para o débito");
      return;
    }

    if (val > parseFloat(scannedCard.currentBalance)) {
      toast.error(`Saldo insuficiente! O participante tem apenas ${parseFloat(scannedCard.currentBalance).toFixed(0)} pontos.`);
      return;
    }

    if (!confirm(`Confirmar débito de ${val} pontos de ${scannedCard.name}?`)) return;

    try {
      setIsLoading(true);
      const res = await fetch("/api/volunteer/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: scannedCard.id,
          amount: (-val).toString(),
          description: `Leilão: ${auctionItem || "Item arrematado"}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLastBalance(data.newBalance);
      setSuccessDialog({ 
        show: true, 
        message: `Débito realizado! Saldo atual de ${scannedCard.name.split(' ')[0]}:`,
        balance: data.newBalance 
      });
      if (scannedCard) {
        handleQRCodeScan(scannedCard.cardNumber || scannedCard.id.toString());
      }
      resetScan();
      setDebitAmount("");
      setAuctionItem("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao debitar pontos");
    } finally {
      setIsLoading(false);
    }
  };

  const [confirmDialog, setConfirmDialog] = useState({ show: false, amount: "" });
  const [successDialog, setSuccessDialog] = useState<{show: boolean, message: string, balance?: string}>({ show: false, message: "" });

  return (
    <div className="min-h-screen bg-gradient-main">
      {/* Success Modal Overlay */}
      {successDialog.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200 border-4 border-green-500">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{successDialog.message}</h3>
            
            {successDialog.balance && (
              <div className="bg-slate-50 rounded-2xl p-6 mb-8 border-2 border-slate-100">
                <p className="text-5xl font-black text-indigo-600 font-inter">
                  {parseFloat(successDialog.balance).toFixed(0)}
                  <span className="text-xl ml-1 text-indigo-400">pts</span>
                </p>
              </div>
            )}

            {!successDialog.balance && <p className="text-lg text-gray-600 mb-8 font-medium">{successDialog.message}</p>}
            
            <button 
              onClick={() => {
                setSuccessDialog({ show: false, message: "" });
                setLastBalance(null);
              }} 
              className="w-full bg-slate-900 hover:bg-black text-white font-bold py-5 rounded-2xl text-xl shadow-lg transition-all active:scale-95"
            >
              FECHAR
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="container p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-8 h-8 text-accent fill-accent" />
            <h1 className="text-xl md:text-2xl font-bold m-0 font-playfair hidden sm:block">Voluntário</h1>
          </div>
          <div className="flex gap-2">
            {user?.role === "admin" ? (
              <button onClick={() => router.push("/admin")} className="btn-secondary px-3 py-2 text-sm md:text-base md:px-4">Admin</button>
            ) : (
              <button onClick={() => router.push("/volunteer/dashboard")} className="btn-secondary px-3 py-2 text-sm md:text-base md:px-4">Dashboard</button>
            )}
            <button onClick={handleLogout} className="btn-secondary p-2 md:px-4" aria-label="Sair">
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Scanner Section */}
            <div className="card-elegant animate-fade-in p-6 md:p-8 bg-white/60 backdrop-blur-sm">
              <h2 className="text-xl md:text-2xl font-playfair font-bold mb-6">Validar Missão</h2>

              {!scannedCard ? (
                <>
                  {!scannerActive ? (
                    <div className="text-center py-8">
                      {cameraError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-600 text-sm">
                          {cameraError}
                        </div>
                      )}

                      <button onClick={startScanner} className="btn-primary w-full sm:w-auto px-8 py-3.5 flex justify-center mx-auto shadow-md">
                        <Camera className="w-5 h-5" />
                        Abrir Câmera
                      </button>

                      <p className="text-sm text-muted-foreground mt-4">
                        Clique para ativar a câmera e escanear o QR Code
                      </p>
                    </div>
                  ) : (
                    <div
                      id="qr-scanner"
                      className="mb-6 rounded-xl overflow-hidden border-2 border-indigo-100 min-h-[300px] shadow-sm bg-black"
                    />
                  )}

                  <div className="pt-6 border-t border-border mt-4">
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Ou digite o Número do cartão ou Nome manualmente
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nº ou Nome"
                        value={manualCardId}
                        onChange={(e) => setManualCardId(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleManualScan()}
                        className="input-elegant bg-white"
                      />
                      <button onClick={handleManualScan} disabled={isLoading} className="btn-primary px-6 shrink-0">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-semibold text-sm md:text-base">Cartão escaneado com sucesso!</span>
                  </div>

                  <div className="bg-white/80 rounded-xl p-5 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Nome</p>
                    <p className="font-semibold text-base mb-4">{scannedCard.name}</p>
                    
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cartão</p>
                    <p className="font-semibold text-sm md:text-base break-all mb-4">{scannedCard.cardNumber || "Sem Cartão"}</p>
                    
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total de Pontos Atual</p>
                    <p className="text-3xl md:text-4xl font-bold text-accent font-inter">
                      {parseFloat(scannedCard.currentBalance).toFixed(0)} <span className="text-sm font-normal">pts</span>
                    </p>
                  </div>

                  <button 
                    onClick={handleAttendance} 
                    disabled={isLoading}
                    className="btn-primary w-full py-4 text-lg bg-green-600 hover:bg-green-700 shadow-lg flex justify-center items-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-6 h-6" /> MARCAR PRESENÇA</>}
                  </button>

                  <button onClick={resetScan} className="btn-secondary w-full py-3 flex justify-center items-center gap-2">
                    <X className="w-4 h-4" /> Novo Scan
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6">
              {/* Card de Adição de Pontos */}
              <div className="card-elegant animate-fade-in p-6 md:p-8 bg-white/60 backdrop-blur-sm">
                <h2 className="text-xl md:text-2xl font-playfair font-bold mb-6">Lançar Pontos</h2>

                {scannedCard ? (
                  confirmDialog.show ? (
                    <div className="flex flex-col gap-4 animate-fade-in h-full justify-center text-center">
                      <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Confirmar Adição</h3>
                        <p className="text-muted-foreground mb-6">
                          Você está lançando <strong className="text-accent text-xl">{parseFloat(confirmDialog.amount).toFixed(0)} pontos</strong> para <strong>{scannedCard.name}</strong>.
                        </p>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => setConfirmDialog({ show: false, amount: "" })} 
                            className="btn-secondary w-full py-3"
                            disabled={isLoading}
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={() => submitCredits(confirmDialog.amount)} 
                            className="btn-primary w-full py-3"
                            disabled={isLoading}
                          >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Confirmar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-5">
                      <div className="bg-indigo-500/10 rounded-xl p-4 border border-indigo-500/20">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Participante</p>
                        <p className="font-semibold text-base">{scannedCard.name}</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="label-elegant mb-2 block">Valores Rápidos</label>
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            {[50, 100, 150].map((val) => (
                              <button
                                key={val}
                                onClick={() => handleQuickAdd(val)}
                                className="bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold py-3 rounded-xl transition-all shadow-sm hover:shadow active:scale-95"
                              >
                                + {val} pts
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="relative">
                          <label className="label-elegant mb-2 block">Pontuação Customizada</label>
                          <div className="relative">
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">pts</span>
                            <input 
                              type="number" 
                              step="1" 
                              min="0" 
                              placeholder="0" 
                              value={amount} 
                              onChange={(e) => setAmount(e.target.value)} 
                              className="input-elegant bg-white" 
                            />
                          </div>
                        </div>

                        <div>
                          <label className="label-elegant mb-2 block">Qual a Missão? (Opcional)</label>
                          <input 
                            type="text" 
                            placeholder="Ex: Visitante, Estudo, Tarefa..." 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)} 
                            className="input-elegant bg-white" 
                          />
                        </div>
                      </div>

                      <button onClick={handleAddPoints} disabled={isLoading || !amount} className="btn-primary w-full py-3.5 mt-2 font-semibold">
                        Lançar Agora
                      </button>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border bg-white/40">
                    <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">Valide um cartão primeiro para lançar a pontuação</p>
                  </div>
                )}
              </div>

              {/* Card de Débito (Leilão) */}
              {scannedCard && auctionEnabled && (
                <div className="card-elegant animate-fade-in p-6 md:p-8 border-2 border-rose-200 bg-rose-50/50">
                  <h2 className="text-xl md:text-2xl font-playfair font-bold mb-6 flex items-center gap-2">
                    <span className="text-2xl">🔨</span> Leilão (Débito)
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="label-elegant mb-2 block">Item do Leilão</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Liquidificador, Cama..." 
                        value={auctionItem} 
                        onChange={(e) => setAuctionItem(e.target.value)} 
                        className="input-elegant bg-white" 
                      />
                    </div>

                    <div className="relative">
                      <label className="label-elegant mb-2 block">Valor do Arremate (Será DEBITADO)</label>
                      <div className="relative">
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 font-bold">DEBITAR</span>
                        <input 
                          type="number" 
                          step="50" 
                          min="0" 
                          placeholder="0" 
                          value={debitAmount} 
                          onChange={(e) => setDebitAmount(e.target.value)} 
                          className="input-elegant bg-white border-rose-200 focus:border-rose-500 text-rose-700 font-bold" 
                        />
                      </div>
                    </div>

                    <p className="text-xs text-rose-600 font-medium">
                      Atenção: Este valor será subtraído do saldo atual do participante ({parseFloat(scannedCard.currentBalance).toFixed(0)} pts).
                    </p>

                    <button 
                      onClick={handleDebit} 
                      disabled={isLoading || !debitAmount} 
                      className="btn-primary w-full py-4 bg-rose-600 hover:bg-rose-700 shadow-rose-200 flex justify-center items-center gap-2"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "CONFIRMAR VENDA (DÉBITO)"}
                    </button>
                  </div>
                </div>
              )}

              {/* Card de Histórico de Transações */}
              {scannedCard && (
                <div className="card-elegant animate-fade-in p-6 md:p-8 bg-white/60 backdrop-blur-sm mt-6">
                  <h2 className="text-xl md:text-2xl font-playfair font-bold mb-6">Histórico de Transações</h2>
                  
                  {scannedTransactions.length > 0 ? (
                    <div className="space-y-4">
                      {scannedTransactions.map((tx) => (
                        <div key={tx.id} className="bg-white rounded-xl p-4 border border-border flex justify-between items-center shadow-sm">
                          <div>
                            <p className="font-semibold text-sm">{tx.description || "Sem descrição"}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(tx.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                          </div>
                          <div className={`font-bold ${parseFloat(tx.amount) > 0 ? 'text-green-600' : 'text-rose-600'} text-right`}>
                            {parseFloat(tx.amount) > 0 ? '+' : ''}{parseFloat(tx.amount).toFixed(0)} pts
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-white/40 rounded-xl border border-dashed border-border">
                      Nenhuma transação recente encontrada.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
