import { Suspense } from "react";
import CallbackClient from "./CallBackClient";

export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Kraunama...</div>}>
      <CallbackClient />
    </Suspense>
  );
}