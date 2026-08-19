"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Heart, LogOut, Loader2, X, Check, Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatGuarani } from "@/lib/utils";

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

export default function ScannerClient() {
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
        setCameraError("Elemento del escáner no encontrado. Recargue la página.");
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
          "Acceso a la cámara denegado. En iPhone: vaya a Ajustes → Safari → Cámara y seleccione \"Permitir\". Luego recargue esta página."
        );
      } else if (errStr.includes("NotFound") || err?.name === "NotFoundError") {
        setCameraError("No se encontró ninguna cámara en el dispositivo.");
      } else {
        setCameraError(`Error al acceder a la cámara: ${errStr || "Verifique los permisos."}`);
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

  const fetchParticipantData = async (cardId: string, showToast = false) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/volunteer/scan?cardId=${encodeURIComponent(cardId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setScannedCard(data.participant);
      setScannedTransactions(data.transactions || []);
      stopScanner();
      if (showToast) {
        toast.success("¡Tarjeta escaneada con éxito!");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al escanear la tarjeta");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQRCodeScan = async (cardId: string) => {
    if (scannedCard) return;
    await fetchParticipantData(cardId, true);
  };

  const handleManualScan = async () => {
    if (!manualCardId.trim()) {
      toast.error("Ingrese un ID de tarjeta válido");
      return;
    }
    await fetchParticipantData(manualCardId.trim(), true);
    setManualCardId("");
  };

  const submitCredits = async (amountToSubmit: string) => {
    if (!scannedCard || !amountToSubmit) {
      toast.error("Monto inválido");
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
          description: description || "Recarga de crédito (Tesorería)",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`¡${formatGuarani(amountToSubmit)} añadido a la tarjeta!`);
      setConfirmDialog({ show: false, amount: "" });
      setAmount("");
      setDescription("");
      await fetchParticipantData(scannedCard.cardNumber || scannedCard.id.toString(), false);
    } catch (error: any) {
      toast.error(error.message || "Error al añadir crédito");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPoints = () => {
    if (!amount) {
      toast.error("Ingrese el monto del crédito");
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
    setDebitAmount("");
    setAuctionItem("");
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const [debitAmount, setDebitAmount] = useState("");
  const [auctionItem, setAuctionItem] = useState("");

  const handleDebit = async () => {
    if (!scannedCard || !debitAmount) {
      toast.error("Ingrese el monto de la compra (débito)");
      return;
    }

    const val = parseFloat(debitAmount);
    if (val <= 0) {
      toast.error("Ingrese un monto positivo para el débito");
      return;
    }

    if (val > parseFloat(scannedCard.currentBalance)) {
      toast.error(`¡Saldo insuficiente! La tarjeta solo posee ${formatGuarani(scannedCard.currentBalance)}.`);
      return;
    }

    const cardDisplayName = scannedCard.name ? scannedCard.name : `Tarjeta #${scannedCard.cardNumber || scannedCard.id}`;
    if (!confirm(`¿Confirmar venta de ${formatGuarani(val)} a ${cardDisplayName}?`)) return;

    try {
      setIsLoading(true);
      const res = await fetch("/api/volunteer/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: scannedCard.id,
          amount: (-val).toString(),
          description: auctionItem ? `Venta: ${auctionItem}` : "Venta en el Puesto",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const saldoAtual = data.newBalance ? data.newBalance : 0;
      toast.success(`¡Venta de ${formatGuarani(val)} realizada! Saldo restante: ${formatGuarani(saldoAtual)}`);
      if (scannedCard) {
        fetchParticipantData(scannedCard.cardNumber || scannedCard.id.toString(), false);
      }
      setDebitAmount("");
      setAuctionItem("");
    } catch (error: any) {
      toast.error(error.message || "Error al realizar la venta");
    } finally {
      setIsLoading(false);
    }
  };

  const [confirmDialog, setConfirmDialog] = useState({ show: false, amount: "" });

  return (
    <div className="min-h-screen bg-gradient-main">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="container p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-8 h-8 text-accent fill-accent" />
            <h1 className="text-xl md:text-2xl font-bold m-0 font-playfair hidden sm:block">
              {user?.role === "admin" ? "Tesorería (Admin)" : "Puesto / Caseta (Voluntario)"}
            </h1>
          </div>
          <div className="flex gap-2">
            {user?.role === "admin" ? (
              <button onClick={() => router.push("/admin")} className="btn-secondary px-3 py-2 text-sm md:text-base md:px-4">Panel Admin</button>
            ) : (
              <button onClick={() => router.push("/volunteer/dashboard")} className="btn-secondary px-3 py-2 text-sm md:text-base md:px-4">Mis Ventas</button>
            )}
            <button onClick={handleLogout} className="btn-secondary p-2 md:px-4" aria-label="Cerrar Sesión">
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
              <h2 className="text-xl md:text-2xl font-playfair font-bold mb-6">Escanear Tarjeta</h2>

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
                        Abrir Cámara
                      </button>

                      <p className="text-sm text-muted-foreground mt-4">
                        Haga clic para activar la cámara y escanear el código QR de la tarjeta
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
                      O ingrese el Número de tarjeta o Nombre manualmente
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nº o Nombre"
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
                    <span className="text-green-700 font-semibold text-sm md:text-base">¡Tarjeta identificada!</span>
                  </div>

                  <div className="bg-white/80 rounded-xl p-5 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Nombre del Alumno / Titular</p>
                    <p className="font-semibold text-base mb-4">{scannedCard.name || `Tarjeta #${scannedCard.cardNumber || scannedCard.id}`}</p>
                    
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Número de Tarjeta</p>
                    <p className="font-semibold text-sm md:text-base break-all mb-4">{scannedCard.cardNumber || "Sin Número"}</p>
                    
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Saldo Disponible en la Tarjeta</p>
                    <p className="text-3xl md:text-4xl font-bold text-accent font-inter">
                      {formatGuarani(scannedCard.currentBalance)}
                    </p>
                  </div>

                  <button onClick={resetScan} className="btn-secondary w-full py-3 flex justify-center items-center gap-2">
                    <X className="w-4 h-4" /> Nuevo Escaneo / Otra Tarjeta
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6">
              {/* Form de Débito / Venda nas Bancas (Visível para Voluntários e Admins) */}
              {scannedCard && (
                <div className="card-elegant animate-fade-in p-6 md:p-8 border-2 border-indigo-200 bg-indigo-50/50">
                  <h2 className="text-xl md:text-2xl font-playfair font-bold mb-6 flex items-center gap-2">
                    <span>🛒</span> Realizar Venta (Débito)
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="label-elegant mb-2 block">Producto / Descripción de la Venta</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Comida, Gaseosa, Empanada..." 
                        value={auctionItem} 
                        onChange={(e) => setAuctionItem(e.target.value)} 
                        className="input-elegant bg-white" 
                      />
                    </div>

                    <div>
                      <label className="label-elegant mb-2 block">Valores Rápidos de Venta (G$)</label>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[5000, 10000, 15000, 20000, 50000, 100000].map((val) => (
                          <button
                            key={val}
                            onClick={() => setDebitAmount(val.toString())}
                            className="bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-sm"
                          >
                            {formatGuarani(val)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <label className="label-elegant mb-2 block">Monto de la Venta (Se DEBITARÁ en G$)</label>
                      <div className="relative">
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 font-bold">DEBITAR</span>
                        <input 
                          type="number" 
                          step="1000" 
                          min="0" 
                          placeholder="Ej: 15000" 
                          value={debitAmount} 
                          onChange={(e) => setDebitAmount(e.target.value)} 
                          className="input-elegant bg-white border-rose-200 focus:border-rose-500 text-rose-700 font-bold text-lg" 
                        />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground font-medium">
                      El monto se descontará del saldo actual de la tarjeta ({formatGuarani(scannedCard.currentBalance)}).
                    </p>

                    <button 
                      onClick={handleDebit} 
                      disabled={isLoading || !debitAmount} 
                      className="btn-primary w-full py-4 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 flex justify-center items-center gap-2 font-bold text-base"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `CONFIRMAR VENTA DE ${debitAmount ? formatGuarani(debitAmount) : 'G$ 0'}`}
                    </button>
                  </div>
                </div>
              )}

              {/* Card de Adición de Crédito (Exclusivo da Tesouraria / Admin) */}
              {user?.role === "admin" && (
                <div className="card-elegant animate-fade-in p-6 md:p-8 bg-emerald-50/60 border border-emerald-200">
                  <h2 className="text-xl md:text-2xl font-playfair font-bold mb-2 text-emerald-900 flex items-center gap-2">
                    <span>💵</span> Tesorería: Recargar Crédito
                  </h2>
                  <p className="text-xs text-emerald-700 mb-6 font-medium">Solo Administradores pueden recargar saldo en la tarjeta.</p>

                  {scannedCard ? (
                    confirmDialog.show ? (
                      <div className="flex flex-col gap-4 animate-fade-in text-center">
                        <div className="bg-white border border-emerald-200 p-6 rounded-2xl">
                          <h3 className="text-lg font-semibold text-foreground mb-2">Confirmar Recarga</h3>
                          <p className="text-muted-foreground mb-6">
                            ¿Añadir <strong className="text-emerald-700 text-xl">{formatGuarani(confirmDialog.amount)}</strong> de crédito para <strong>{scannedCard.name || `Tarjeta #${scannedCard.cardNumber}`}</strong>?
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
                              className="btn-primary bg-emerald-600 hover:bg-emerald-700 w-full py-3"
                              disabled={isLoading}
                            >
                              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Confirmar Recarga"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="label-elegant mb-2 block">Valores Rápidos de Recarga (G$)</label>
                          <div className="grid grid-cols-3 gap-2 mb-4">
                            {[10000, 20000, 50000, 100000, 200000, 500000].map((val) => (
                              <button
                                key={val}
                                onClick={() => handleQuickAdd(val)}
                                className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-xs md:text-sm"
                              >
                                + {formatGuarani(val)}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="relative">
                          <label className="label-elegant mb-2 block">Monto Personalizado de Recarga (G$)</label>
                          <input 
                            type="number" 
                            step="1000" 
                            min="0" 
                            placeholder="Ej: 50000" 
                            value={amount} 
                            onChange={(e) => setAmount(e.target.value)} 
                            className="input-elegant bg-white text-emerald-800 font-bold" 
                          />
                        </div>

                        <div>
                          <label className="label-elegant mb-2 block">Observación (Opcional)</label>
                          <input 
                            type="text" 
                            placeholder="Ej: Recarga Tesorería" 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)} 
                            className="input-elegant bg-white" 
                          />
                        </div>

                        <button 
                          onClick={handleAddPoints} 
                          disabled={isLoading || !amount} 
                          className="btn-primary bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 w-full py-3.5 mt-2 font-semibold"
                        >
                          Añadir Crédito Ahora
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 px-4 rounded-xl border border-dashed border-emerald-200 bg-white/40">
                      <p className="text-muted-foreground text-sm">Escanee una tarjeta para realizar recargas en la Tesorería.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Card de Histórico de Transações */}
              {scannedCard && (
                <div className="card-elegant animate-fade-in p-6 md:p-8 bg-white/60 backdrop-blur-sm">
                  <h2 className="text-xl md:text-2xl font-playfair font-bold mb-6">Historial de la Tarjeta</h2>
                  
                  {scannedTransactions.length > 0 ? (
                    <div className="space-y-4">
                      {scannedTransactions.map((tx) => (
                        <div key={tx.id} className="bg-white rounded-xl p-4 border border-border flex justify-between items-center shadow-sm">
                          <div>
                            <p className="font-semibold text-sm">{tx.description || "Sin descripción"}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(tx.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                          </div>
                          <div className={`font-bold ${parseFloat(tx.amount) > 0 ? 'text-green-600' : 'text-rose-600'} text-right`}>
                            {parseFloat(tx.amount) > 0 ? '+' : ''}{formatGuarani(tx.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-white/40 rounded-xl border border-dashed border-border">
                      No se encontraron transacciones recientes en esta tarjeta.
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
