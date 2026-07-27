import { Suspense } from "react";
import PrintCardsClient from "./PrintCardsClient";

export const dynamic = "force-dynamic";

export default function PrintCardsPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Carregando...</div>}>
      <PrintCardsClient />
    </Suspense>
  );
}
