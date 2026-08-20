"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AuthClient from "./auth/AuthClient";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-emerald-400 text-base font-semibold flex items-center gap-3 bg-slate-900/80 px-6 py-4 rounded-2xl border border-slate-800 shadow-2xl">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
          Carregando Sistema Financeiro...
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) return null;

  return <AuthClient />;
}
