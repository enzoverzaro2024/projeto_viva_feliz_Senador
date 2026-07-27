"use client";

import { useEffect, useState } from "react";
import { Zap, Heart, Loader2 } from "lucide-react";

interface ParticipantRanking {
  id: number;
  name: string;
  cardNumber: string | null;
  currentBalance: string;
}

export default function LeilaoClient() {
  const [participants, setParticipants] = useState<ParticipantRanking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRanking = async () => {
    try {
      const res = await fetch("/api/public/ranking");
      const data = await res.json();
      if (res.ok) {
        setParticipants(data.participants || []);
      }
    } catch (error) {
      console.error("Error fetching ranking:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanking();
    const interval = setInterval(fetchRanking, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500 w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white overflow-hidden p-8 font-inter">
      {/* Background Glow */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/20 blur-[120px] rounded-full" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-rose-500 p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
            <Zap className="w-10 h-10 text-white fill-current" />
          </div>
          <div>
            <h1 className="text-4xl font-bold font-playfair tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Monitor de Leilão - Viva Feliz
            </h1>
            <p className="text-indigo-400 font-medium tracking-widest text-xs uppercase">
              Ranking de Poder de Compra em Tempo Real
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-3 rounded-full backdrop-blur-md">
          <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
          <span className="text-sm font-bold tracking-wider text-rose-100 uppercase">AO VIVO</span>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-[1600px] mx-auto">
        {/* Top 3 Podium */}
        <div className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold font-playfair mb-2 text-rose-200">💎 Os Magnatas</h2>
          {participants.slice(0, 3).map((p, index) => (
            <div 
              key={p.id}
              className={`relative overflow-hidden group p-8 rounded-[2rem] border transition-all duration-500 scale-100 hover:scale-[1.02] ${
                index === 0 
                  ? 'bg-gradient-to-br from-amber-400/20 to-amber-600/5 border-amber-500/50 shadow-2xl shadow-amber-500/20' 
                  : index === 1
                  ? 'bg-gradient-to-br from-slate-300/20 to-slate-500/5 border-slate-400/50 shadow-xl'
                  : 'bg-gradient-to-br from-orange-400/20 to-orange-700/5 border-orange-500/50 shadow-lg'
              }`}
            >
              <div className={`absolute top-6 right-8 text-6xl font-black opacity-20 ${
                index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : 'text-orange-500'
              }`}>
                {index + 1}º
              </div>

              <div className="flex items-center gap-6">
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-4xl border-2 ${
                  index === 0 ? 'bg-amber-500/20 border-amber-500 text-amber-400' : index === 1 ? 'bg-slate-500/20 border-slate-500 text-slate-300' : 'bg-orange-500/20 border-orange-500 text-orange-400'
                }`}>
                  {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
                </div>
                <div>
                  <h3 className="text-3xl font-bold mb-1">{p.name}</h3>
                  <p className="text-lg text-white/50 font-medium font-mono">CARTÃO NO {p.cardNumber || '---'}</p>
                </div>
                <div className="ml-auto text-right">
                  <div className={`text-5xl font-black mb-1 ${
                    index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-200' : 'text-orange-400'
                  }`}>
                    {parseFloat(p.currentBalance).toFixed(0)}
                  </div>
                  <div className="text-sm font-bold tracking-widest text-white/40 uppercase">PONTOS</div>
                </div>
              </div>
            </div>
          ))}

          {/* Tips / Info */}
          <div className="mt-auto bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-3xl">
            <div className="flex gap-4">
              <Heart className="w-6 h-6 text-indigo-400 flex-shrink-0" />
              <p className="text-sm text-indigo-200/80 leading-relaxed">
                Dados atualizados em tempo real conforme as ofertas são arrematadas no Scanner.
              </p>
            </div>
          </div>
        </div>

        {/* Regular list */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-sm">
          <h2 className="text-xl font-bold font-playfair mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-lg">💰</span>
            Próximos Participantes
          </h2>
          <div className="flex flex-col gap-3">
            {participants.slice(3, 15).map((p, index) => (
              <div 
                key={p.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-4">
                  <span className="w-10 text-center font-bold text-gray-500">{index + 4}º</span>
                  <div>
                    <div className="font-bold text-lg">{p.name}</div>
                    <div className="text-xs text-indigo-400 font-mono">CARTÃO {p.cardNumber || '---'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-rose-400">
                    {parseFloat(p.currentBalance).toFixed(0)}
                  </div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">PONTOS</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
