import { Suspense } from "react";
import RegistroClient from "./RegistroClient";

export const dynamic = "force-dynamic";

export default function ParticipantRegisterPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Carregando...</div>}>
      <RegistroClient />
    </Suspense>
  );
}
