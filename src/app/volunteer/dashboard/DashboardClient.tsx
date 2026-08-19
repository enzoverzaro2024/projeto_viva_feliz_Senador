"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Heart, LogOut, Zap, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { formatGuarani } from "@/lib/utils";
import { toast } from "sonner";

interface TransactionData {
  id: number;
  participantId: number;
  amount: string;
  description: string | null;
  createdAt: string;
}

export default function DashboardClient() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (user.role !== "volunteer" && user.role !== "admin")) {
      router.push("/");
      return;
    }
    fetchTransactions();
  }, [user]);

  const fetchTransactions = async () => {
    try {
      const res = await fetch("/api/volunteer/credits");
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch {
      toast.error("Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (!user || (user.role !== "volunteer" && user.role !== "admin")) {
    return null;
  }

  // Vendas reais (débitos amount < 0)
  const totalSales = transactions.reduce(
    (sum, txn) => sum + (parseFloat(txn.amount) < 0 ? Math.abs(parseFloat(txn.amount)) : 0),
    0
  );

  return (
    <div className="min-h-screen bg-gradient-main">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="container p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-8 h-8 text-accent fill-accent" />
            <h1 className="text-xl md:text-2xl font-bold m-0 font-playfair hidden sm:block">Painel da Banca</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push("/volunteer/scanner")} className="btn-primary flex items-center gap-2 p-2 px-3 md:px-4 text-sm">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Scanner de Vendas</span>
            </button>
            <button onClick={handleLogout} className="btn-secondary p-2 px-3 md:px-4" aria-label="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
            <div className="card-elegant animate-fade-in bg-gradient-to-br from-indigo-50/50 to-indigo-100/30 border-indigo-100 p-6 shadow-sm">
              <div className="flex flex-col h-full justify-between">
                <p className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Total em Vendas da Banca (G$)</p>
                <div>
                  <p className="text-3xl md:text-4xl font-bold text-accent font-inter tracking-tight">
                    {formatGuarani(totalSales)}
                  </p>
                  <p className="text-sm text-foreground/80 mt-2 font-medium bg-white/50 w-fit px-2 py-1 rounded">
                    {transactions.length} operações registradas
                  </p>
                </div>
              </div>
            </div>

            <div className="card-elegant animate-fade-in delay-100 p-6 shadow-sm bg-white/60 backdrop-blur-sm">
              <div className="flex items-start gap-4 h-full">
                <div className="bg-accent/10 p-3 rounded-xl hidden sm:block">
                  <Heart className="w-8 h-8 text-accent shrink-0" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Banca / Operador</p>
                  <p className="text-2xl md:text-3xl font-playfair font-bold mb-1">{user.name}</p>
                  <p className="text-sm md:text-base text-muted-foreground break-all">{user.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="card-elegant animate-fade-in delay-200 p-0 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border bg-white/50">
              <h2 className="text-xl md:text-2xl font-playfair font-bold">Histórico de Operações da Banca</h2>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
              </div>
            ) : transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">ID</th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Participante</th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Valor</th>
                      <th className="px-6 py-4 font-semibold">Descrição</th>
                      <th className="px-6 py-4 font-semibold whitespace-nowrap">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.map((txn) => {
                      const amountVal = parseFloat(txn.amount);
                      return (
                        <tr key={txn.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-muted-foreground whitespace-nowrap">
                            #{txn.id}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                            ID: {txn.participantId}
                          </td>
                          <td className={`px-6 py-4 text-sm font-bold whitespace-nowrap ${amountVal < 0 ? 'text-rose-600' : 'text-green-600'}`}>
                            {amountVal > 0 ? '+' : ''}{formatGuarani(txn.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground/80 min-w-[200px]">
                            {txn.description || "-"}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(txn.createdAt).toLocaleDateString("pt-BR", {
                              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-white/50">
                <p className="text-muted-foreground">Nenhuma operação realizada ainda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
