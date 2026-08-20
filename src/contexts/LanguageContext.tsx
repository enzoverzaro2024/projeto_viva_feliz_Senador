"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "pt" | "es";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  pt: {
    systemTitle: "SISTEMA FINANCEIRO",
    adminSubtitle: "Painel Administrativo da Feira Escolar",
    volunteerSubtitle: "Terminal de Venda — Puesto / Caseta",
    scanner: "Escanear POS",
    logout: "Sair",
    loginTitle: "Acessar Conta",
    createAccountTitle: "Criar Nova Conta",
    loginSubtitle: "Informe suas credenciais financeiras para entrar",
    emailOrCard: "Email ou Nº do Cartão",
    password: "Senha de Acesso",
    loginBtn: "ENTRAR NO SISTEMA",
    createAccountBtn: "CRIAR CONTA AGORA",
    noAccount: "Não possui conta cadastrada? Clique aqui",
    hasAccount: "Já tem uma conta no sistema? Faça Login",
    
    // Tabs
    tabBancas: "📊 Relatório por Banca",
    tabParticipantes: "💳 Cartões / Compradores",
    tabPontos: "💵 Tesouraria (Recargas)",
    tabTransacoes: "📈 Gestão de Operações (CRUD)",
    tabCartoes: "🎴 Lote de Cartões",
    tabUsuarios: "👥 Gestão de Usuários",
    tabAprovacoes: "🔔 Aprovações Pendentes",

    // Common labels
    treasuryRecharges: "Recargas da Tesouraria",
    boothSales: "Vendas nas Bancas",
    cardBalance: "Saldo nos Cartões",
    boothOperator: "Banca / Operador",
    salesCount: "Qtd. Operações de Venda",
    totalSold: "Total Vendido (G$)",
    newParticipant: "Novo Comprador",
    cardNumber: "Nº do Cartão",
    balance: "Saldo em Guaranis (G$)",
    actions: "Ações",
    newOperation: "Nova Operação Manual",
    exportCsv: "Exportar CSV",
    updateData: "Atualizar Dados",
    searchPlaceholder: "Buscar por comprador, cartão, banca ou descrição...",
    filterAll: "Todas",
    filterCredit: "🟢 Recargas (Crédito)",
    filterDebit: "🔴 Vendas (Débito)",
    confirmSale: "CONFIRMAR VENDA DE",
    addCredit: "Añadir Crédito Ahora",
    amount: "Valor da Operação (G$)",
    description: "Descrição / Motivo",
  },
  es: {
    systemTitle: "SISTEMA FINANCIERO",
    adminSubtitle: "Panel Administrativo de la Feria Escolar",
    volunteerSubtitle: "Terminal de Venta — Puesto / Caseta",
    scanner: "Escanear POS",
    logout: "Cerrar Sesión",
    loginTitle: "Ingresar al Sistema",
    createAccountTitle: "Crear Nueva Cuenta",
    loginSubtitle: "Ingrese sus credenciales financieras para continuar",
    emailOrCard: "Correo o Nº de Tarjeta",
    password: "Contraseña de Acceso",
    loginBtn: "INGRESAR AL SISTEMA",
    createAccountBtn: "CREAR CUENTA AHORA",
    noAccount: "¿No tiene cuenta registrada? Haga clic aquí",
    hasAccount: "¿Ya tiene cuenta en el sistema? Inicie Sesión",

    // Tabs
    tabBancas: "📊 Reporte por Puesto",
    tabParticipantes: "💳 Tarjetas / Compradores",
    tabPontos: "💵 Tesorería (Recargas)",
    tabTransacoes: "📈 Historial de Operaciones (CRUD)",
    tabCartoes: "🎴 Lote de Tarjetas",
    tabUsuarios: "👥 Gestión de Usuarios",
    tabAprovacoes: "🔔 Aprobaciones Pendientes",

    // Common labels
    treasuryRecharges: "Recargas de Tesorería",
    boothSales: "Ventas en Puestos",
    cardBalance: "Saldo en Tarjetas",
    boothOperator: "Puesto / Operador",
    salesCount: "Cant. Operaciones de Venta",
    totalSold: "Total Vendido (G$)",
    newParticipant: "Nuevo Comprador",
    cardNumber: "Nº de Tarjeta",
    balance: "Saldo en Guaraníes (G$)",
    actions: "Acciones",
    newOperation: "Nueva Operación Manual",
    exportCsv: "Exportar CSV",
    updateData: "Actualizar Datos",
    searchPlaceholder: "Buscar por comprador, tarjeta, puesto o descripción...",
    filterAll: "Todas",
    filterCredit: "🟢 Recargas (Crédito)",
    filterDebit: "🔴 Ventas (Débito)",
    confirmSale: "CONFIRMAR VENTA DE",
    addCredit: "Añadir Crédito Ahora",
    amount: "Monto de la Operación (G$)",
    description: "Descripción / Motivo",
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: "pt",
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("pt");

  useEffect(() => {
    const saved = localStorage.getItem("appLanguage") as Language;
    if (saved && (saved === "pt" || saved === "es")) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("appLanguage", lang);
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations["pt"]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 shadow-inner text-xs font-sans">
      <button
        type="button"
        onClick={() => setLanguage("pt")}
        className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
          language === "pt"
            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 scale-105"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
        }`}
        title="Português (Brasil)"
      >
        <span className="text-sm">🇧🇷</span>
        <span className="hidden sm:inline">PT</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage("es")}
        className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
          language === "es"
            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 scale-105"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
        }`}
        title="Español (Paraguay)"
      >
        <span className="text-sm">🇵🇾</span>
        <span className="hidden sm:inline">ES</span>
      </button>
    </div>
  );
}
