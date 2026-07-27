import { Suspense } from "react";
import ScannerClient from "./ScannerClient";

export const dynamic = "force-dynamic";

export default function VolunteerScannerPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Carregando...</div>}>
      <ScannerClient />
    </Suspense>
  );
}
