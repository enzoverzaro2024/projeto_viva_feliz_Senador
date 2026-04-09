"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Heart, QrCode, Users, Star, ArrowRight } from "lucide-react";
import { useEffect } from "react";

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
      <div className="min-h-screen bg-gradient-main flex items-center justify-center">
        <div className="animate-pulse text-accent text-lg font-semibold">
          Carregando...
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-orange-400 p-1.5 rounded-lg">
              <Star className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">Viva Feliz</span>
          </div>
          <a href="/auth" className="text-sm font-semibold text-orange-500 hover:text-orange-700 transition-colors">
            Acessar Painel
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main>
        <div className="bg-gradient-to-b from-orange-50/50 to-white">
          <section className="container mx-auto px-6 py-20 md:py-32 text-center">
            <div className="max-w-3xl mx-auto animate-fade-in">
              <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
                Projeto Comunitário <span className="text-orange-400">Viva Feliz</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed">
                Nossa missão é fortalecer a comunidade através de eventos organizados e engajamento social. 
                Utilize nosso sistema de cartões para participar de atividades e acumular benefícios.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/auth" className="bg-orange-400 hover:bg-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2 group">
                  Criar Meu Cartão Virtual
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Simple Features */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="bg-orange-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <QrCode className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Cartão Digital</h3>
                <p className="text-gray-600 leading-relaxed">
                  Acesso rápido ao seu QR Code exclusivo para identificação em nossos eventos e atividades.
                </p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Engajamento</h3>
                <p className="text-gray-600 leading-relaxed">
                  Participe de ações sociais e culturais coletivas que impactam positivamente o nosso bairro.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Benefícios</h3>
                <p className="text-gray-600 leading-relaxed">
                  Receba reconhecimento e premiações baseadas na sua participação ativa em nossos projetos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="container mx-auto px-6 py-10">
          <div className="bg-gray-900 rounded-[2.5rem] p-10 md:p-16 text-center text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Faça parte da nossa rede</h2>
              <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
                Cadastre-se hoje mesmo e comece a participar das nossas atividades comunitárias.
              </p>
              <a href="/auth" className="inline-block bg-white text-gray-900 px-8 py-4 rounded-xl font-extrabold hover:bg-orange-50 transition-colors">
                Registrar Agora
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-gray-100 mt-10">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-500 text-sm">
            © 2026 Projeto Comunitário Viva Feliz. Foco no desenvolvimento social.
          </p>
        </div>
      </footer>
    </div>
  );
}
