import { Suspense } from "react";
import LeilaoClient from "./LeilaoClient";

export const dynamic = "force-dynamic";

export default function AuctionMonitorPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: "#fff" }}>Carregando...</div>}>
      <LeilaoClient />
    </Suspense>
  );
}
