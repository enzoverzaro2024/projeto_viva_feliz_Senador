import { Suspense } from "react";
import CartaoClient from "./CartaoClient";

export const dynamic = "force-dynamic";

export default function CartaoPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Carregando...</div>}>
      <CartaoClient />
    </Suspense>
  );
}
