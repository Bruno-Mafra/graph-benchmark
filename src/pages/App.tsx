import { useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LogoDark from "../assets/logo-dark-2.png";
import GraphBenchmark from "./GraphBenchmark";
import MazeBenchmark from "./MazeBenchmark";
import { MainContent, PageHeader, HeaderContent, TabBar, TabButton } from "./styles";

const TABS = [
  { id: "graph", label: "Grafos" },
  { id: "maze", label: "Labirintos" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("graph");

  return (
    <MainContent>
      <ToastContainer position="top-center" theme="light" />
      <PageHeader>
        <HeaderContent>
          <img src={LogoDark} className="logo" alt="Vite logo" />
          <h1>Graph Benchmark</h1>
          <TabBar role="tablist" aria-label="Seções do benchmark">
            {TABS.map((tab) => (
              <TabButton
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                $active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </TabButton>
            ))}
          </TabBar>
        </HeaderContent>
      </PageHeader>
      {/* As abas ficam montadas para preservar o estado de cada uma ao alternar. */}
      <div role="tabpanel" style={{ display: activeTab === "graph" ? "contents" : "none" }}>
        <GraphBenchmark />
      </div>
      <div role="tabpanel" style={{ display: activeTab === "maze" ? "contents" : "none" }}>
        <MazeBenchmark />
      </div>
    </MainContent>
  );
}

export default App;
