import { useEffect } from "react";
import { MapShell } from "./components/map/MapShell";
import { ChatPanel } from "./components/chat/ChatPanel";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { Header } from "./components/layout/Header";
import { initLocalModel } from "./lib/ai/localModel/engineClient";

function App() {
  useEffect(() => {
    void initLocalModel();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh" }}>
      <Header>
        <SettingsPanel />
      </Header>
      <div className="app-body">
        <div className="map-pane">
          <MapShell />
        </div>
        <div className="chat-rail">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
