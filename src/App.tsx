import { MapShell } from "./components/map/MapShell";
import { ChatPanel } from "./components/chat/ChatPanel";
import { OnboardingGate } from "./components/onboarding/OnboardingGate";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { Header } from "./components/layout/Header";
import { useCredentials } from "./lib/credentials/useCredentials";

function App() {
  const hasCredentials = useCredentials((s) => !!s.credentials);

  return (
    <OnboardingGate>
      <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh" }}>
        <Header>
          <SettingsPanel />
        </Header>
        <div className="app-body">
          <div className="map-pane">
            <MapShell />
          </div>
          <div className="chat-rail">
            {/* ChatPanel owns useChatRuntime, which can't safely hot-swap
                between an undefined and a real transport mid-lifecycle — so
                it only mounts once credentials (and therefore a stable
                transport) exist. */}
            {hasCredentials && <ChatPanel />}
          </div>
        </div>
      </div>
    </OnboardingGate>
  );
}

export default App;
