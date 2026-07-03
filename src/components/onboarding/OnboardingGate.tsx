import type { ReactNode } from "react";
import { useCredentials } from "../../lib/credentials/useCredentials";
import { OnboardingModal } from "./OnboardingModal";

export function OnboardingGate({ children }: { children: ReactNode }) {
  const credentials = useCredentials((s) => s.credentials);

  return (
    <>
      {children}
      {!credentials && <OnboardingModal />}
    </>
  );
}
