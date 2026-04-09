"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ParticipantRegister() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    address: "",
    neighborhood: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Cadastro realizado com sucesso!");
      router.push("/participante/cartao");
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-main">
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', background: 'rgba(250,249,247,0.85)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Heart style={{ width: 32, height: 32, color: 'var(--accent)', fill: 'var(--accent)' }} />
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Viva Feliz</h1>
        </div>
      </header>

      {/* Main */}
      <div className="container" style={{ padding: '3rem 1rem' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div className="card-elegant animate-fade-in">
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Bem-vindo!</h2>
              <p style={{ color: 'var(--muted-foreground)' }}>
                Complete seu cadastro para receber seu cartão virtual com QR Code.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="label-elegant" htmlFor="name">Nome Completo</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Seu nome"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="input-elegant"
                />
              </div>

              <div>
                <label className="label-elegant" htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Seu email (opcional)"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-elegant"
                />
              </div>

              <div>
                <label className="label-elegant" htmlFor="phone">Telefone</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="(11) 99999-9999 (opcional)"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-elegant"
                />
              </div>

              <div>
                <label className="label-elegant" htmlFor="age">Idade</label>
                <input
                  id="age"
                  name="age"
                  type="text"
                  placeholder="Sua idade (opcional)"
                  value={formData.age}
                  onChange={handleChange}
                  className="input-elegant"
                />
              </div>

              <div>
                <label className="label-elegant" htmlFor="address">Endereço</label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  placeholder="Nome da rua, nº (opcional)"
                  value={formData.address}
                  onChange={handleChange}
                  className="input-elegant"
                />
              </div>

              <div>
                <label className="label-elegant" htmlFor="neighborhood">Bairro</label>
                <input
                  id="neighborhood"
                  name="neighborhood"
                  type="text"
                  placeholder="Seu bairro (opcional)"
                  value={formData.neighborhood}
                  onChange={handleChange}
                  className="input-elegant"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary"
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.9rem' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
                    Registrando...
                  </>
                ) : (
                  "Criar Cartão Virtual"
                )}
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
              <p>Seu cartão será gerado automaticamente após o registro.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
