"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { CreditCard, Lock, Mail, User, ShieldCheck, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function AuthClient() {
  const { user, isAuthenticated, login, register } = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "admin") {
        router.push("/admin");
      } else if (user.role === "volunteer") {
        router.push("/volunteer/dashboard");
      } else {
        router.push("/participante/cartao");
      }
    }
  }, [isAuthenticated, user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success("Autenticação realizada com sucesso!");
      } else {
        await register(formData.name, formData.email, formData.password);
        toast.success("Conta cadastrada com sucesso!");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao autenticar no sistema");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-900 font-sans relative overflow-hidden">
      {/* Background Decorative Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white font-inter">
                SISTEMA FINANCEIRO <span className="text-emerald-400">G$</span>
              </span>
              <span className="block text-[11px] font-mono text-slate-400 uppercase tracking-widest">
                Gestão de Crédito & Recargas
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-800/50">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Acesso Seguro Criptografado
          </div>
        </div>
      </header>

      {/* Main Login Form Section */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/80 relative overflow-hidden">
            {/* Top Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-blue-500" />

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 mb-4 shadow-inner">
                <Lock className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2 font-inter">
                {isLogin ? "Acessar Conta" : "Criar Nova Conta"}
              </h2>
              <p className="text-slate-400 text-sm">
                {isLogin
                  ? "Informe suas credenciais financeiras para entrar"
                  : "Preencha os dados abaixo para registrar sua conta"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      name="name"
                      type="text"
                      placeholder="Ex: João da Silva"
                      value={formData.name}
                      onChange={handleChange}
                      required={!isLogin}
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Email ou Nº do Cartão
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    name="email"
                    type="text"
                    placeholder="email@exemplo.com ou Nº do cartão"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 mt-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                ) : (
                  <>
                    <span>{isLogin ? "ENTRAR NO SISTEMA" : "CRIAR CONTA AGORA"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors bg-transparent border-none cursor-pointer"
              >
                {isLogin
                  ? "Não possui conta cadastrada? Clique aqui"
                  : "Já tem uma conta no sistema? Faça Login"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 bg-slate-950/80 py-4 text-center">
        <div className="container text-xs text-slate-400 font-mono">
          Sistema Financeiro de Cartões & Recargas G$ — Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
