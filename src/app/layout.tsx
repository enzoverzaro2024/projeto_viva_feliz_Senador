import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema Financeiro - Cartões & Recargas G$",
  description: "Sistema elegante e seguro para gerenciar cartões virtuais e créditos em eventos e feiras.",
  keywords: ["evento", "créditos", "cartão virtual", "QR code", "feira", "guarani"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <LanguageProvider>
            {children}
            <Toaster richColors position="top-right" />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
