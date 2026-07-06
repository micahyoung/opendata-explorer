import type { ReactNode } from "react";
import { useCredentials } from "../../lib/credentials/useCredentials";
import { usePendingUrlConfig } from "../../lib/credentials/pendingUrlConfig";
import { OnboardingModal } from "./OnboardingModal";

export function OnboardingGate({ children }: { children: ReactNode }) {
  const credentials = useCredentials((s) => s.credentials);
  const status = usePendingUrlConfig((s) => s.status);

  return (
    <>
      {children}
      {!credentials && status === "ready" && <OnboardingModal />}
    </>
  );
}
