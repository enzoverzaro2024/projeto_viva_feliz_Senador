import { Suspense } from "react";
import AuthClient from "./AuthClient";

export const dynamic = "force-dynamic";

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Carregando...</div>}>
      <AuthClient />
    </Suspense>
  );
}
