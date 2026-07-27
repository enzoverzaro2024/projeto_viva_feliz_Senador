"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
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
        toast.success("Login realizado com sucesso!");
      } else {
        await register(formData.name, formData.email, formData.password);
        toast.success("Conta criada com sucesso!");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-main flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="container p-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-inherit no-underline">
            <Heart className="w-8 h-8 text-accent fill-accent" />
            <h1 className="text-xl md:text-2xl font-bold m-0 font-playfair">EventCard</h1>
          </a>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center p-4 py-12 w-full">
        <div className="card-elegant animate-fade-in w-full max-w-md p-6 sm:p-8 bg-white/60 backdrop-blur-sm border-indigo-100 shadow-xl shadow-indigo-500/5">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-playfair font-bold mb-2">
              {isLogin ? "Bem-vindo de volta!" : "Criar Conta"}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              {isLogin
                ? "Faça login para acessar seu cartão"
                : "Cadastre-se para participar do evento"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="label-elegant" htmlFor="name">Nome Completo</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Seu nome"
                  value={formData.name}
                  onChange={handleChange}
                  required={!isLogin}
                  className="input-elegant bg-white/50"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="label-elegant" htmlFor="email">Email ou Número do Cartão</label>
              <input
                id="email"
                name="email"
                type="text"
                placeholder="email@exemplo.com ou Nº do cartão"
                value={formData.email}
                onChange={handleChange}
                required
                className="input-elegant bg-white/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="label-elegant" htmlFor="password">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                className="input-elegant bg-white/50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3.5 mt-2 font-semibold shadow-md flex justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                "Entrar"
              ) : (
                "Criar Conta"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border/60 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-semibold text-accent hover:underline bg-transparent border-none cursor-pointer"
            >
              {isLogin
                ? "Não tem uma conta? Cadastre-se"
                : "Já tem uma conta? Faça login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
