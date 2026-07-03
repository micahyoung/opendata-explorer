import { MapShell } from "./components/map/MapShell";
import { ChatPanel } from "./components/chat/ChatPanel";
import { OnboardingGate } from "./components/onboarding/OnboardingGate";
import { SettingsPanel } from "./components/settings/SettingsPanel";

function App() {
  return (
    <OnboardingGate>
      <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <MapShell />
          <SettingsPanel />
        </div>
        <div style={{ width: 380, flexShrink: 0, borderLeft: "1px solid #e9ecef" }}>
          <ChatPanel />
        </div>
      </div>
    </OnboardingGate>
  );
}

export default App;
