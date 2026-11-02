import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import type { Node, Edge } from "reactflow";
import GraphEditor from "../components/GraphEditor/GraphEditor";
import type { GraphHighlight } from "../components/GraphEditor/GraphEditor";
import GraphImportPanel from "../components/GraphImportPanel/GraphImportPanel";
import PresetGraphModal from "../components/PresetGraphModal/PresetGraphModal";
import GraphProperties from "../components/GraphProperties/GraphProperties";
import GraphAlgorithmPicker from "../components/GraphAlgorithmPicker/GraphAlgorithmPicker";
import GraphResults from "../components/GraphResults/GraphResults";
import type { SkippedAlgorithm } from "../components/GraphResults/GraphResults";
import GraphGrowthCurve from "../components/GraphGrowthCurve/GraphGrowthCurve";
import { serializeGraphToJson, nextNodeCounterFromNodes, GRAPH_FILE_EXTENSION } from "../graph/graphFileFormat";
import { editorToGraph, edgeIsBidirectional, nodeLabel, semanticSignature } from "../graph/editorModel";
import { generatedToEditor } from "../graph/editorBuild";
import { generateGeometric } from "../graph/generators";
import { analyzeGraph } from "../graph/analysis";
import { buildInstance } from "../graph/types";
import { GRAPH_ALGORITHMS, GRAPH_ALGORITHM_IDS } from "../graph/algorithms/registry";
import type { Compatibility, GraphAlgorithmId } from "../graph/algorithms/types";
import type { GraphRunResult } from "../graph/benchmark/runner";
import { runGraphRequests } from "../graph/benchmark/client";
import { createRng } from "../utils/random";
import {
  PageContent,
  CreateGraphContainer,
  SectionContainer,
  EmptySectionContainer,
  Divider,
  OptionsWrapper,
  OptionBox,
  HiddenRadio,
  CustomRadio,
  RadioLabel,
  BenchmarkParagraph,
  StartBenchmarkButton,
  SourceLabel,
  SourceSelect,
} from "./styles";
import { ActionButton, ControlsRow, FieldHint, NumberField } from "./mazeStyles";

/** Todos selecionados por padrão, exceto os experimentais. */
const ALL_SELECTED = Object.fromEntries(
  GRAPH_ALGORITHM_IDS.map((id) => [id, !GRAPH_ALGORITHMS[id].experimental])
) as Record<GraphAlgorithmId, boolean>;
const PATH_COLOR = "#facc15";

/** Grafo inicial: geométrico pequeno (não direcionado, pesos ∝ distância). */
function initialGraph() {
  return generatedToEditor(generateGeometric(12, { rng: createRng(11) }));
}

type Progress = { label: string; done: number; total: number };

function GraphBenchmark() {
  const [initial] = useState(initialGraph);
  const [view, setView] = useState<"editor" | "import">("editor");
  const [nodes, setNodes] = useState<Node[]>(initial.nodes);
  const [edges, setEdges] = useState<Edge[]>(initial.edges);
  const [counter, setCounter] = useState(initial.nodes.length);
  const [viewKey, setViewKey] = useState(0);
  const [sourceId, setSourceId] = useState<string | null>("node-0");
  const [targetId, setTargetId] = useState<string | null>(`node-${initial.nodes.length - 1}`);
  const [presetOpen, setPresetOpen] = useState(false);

  const [selected, setSelected] = useState(ALL_SELECTED);
  const [samples, setSamples] = useState("5");
  const [results, setResults] = useState<GraphRunResult[]>([]);
  const [skipped, setSkipped] = useState<SkippedAlgorithm[]>([]);
  const [runKey, setRunKey] = useState<string | null>(null);
  const [selectedResultId, setSelectedResultId] = useState<GraphAlgorithmId | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelRef.current?.(), []);

  // ---- grafo derivado do editor (a análise só muda com a estrutura, não ao arrastar nós)
  const nodeIdsKey = useMemo(() => nodes.map((n) => n.id).join("\u0001"), [nodes]);
  const structure = useMemo(() => {
    const ids = nodeIdsKey ? nodeIdsKey.split("\u0001") : [];
    const idSet = new Set(ids);
    const valid = edges.filter((e) => idSet.has(e.source) && idSet.has(e.target));
    const undirected = valid.filter(edgeIsBidirectional).length;
    const eg = editorToGraph(
      ids.map((id) => ({ id, position: { x: 0, y: 0 }, data: {} })),
      edges
    );
    return {
      ids,
      index: new Map(ids.map((id, i) => [id, i])),
      analysis: analyzeGraph(buildInstance(eg.graph), { directed: valid.length - undirected, undirected }),
      danglingEdges: eg.danglingEdges,
    };
  }, [nodeIdsKey, edges]);
  const labels = useMemo(() => nodes.map(nodeLabel), [nodes]);
  const signature = useMemo(() => semanticSignature(nodes, edges), [nodes, edges]);

  const effectiveSource = sourceId && structure.index.has(sourceId) ? sourceId : (structure.ids[0] ?? null);
  const effectiveTarget = targetId && structure.index.has(targetId) ? targetId : null;
  const sourceIndex = effectiveSource ? structure.index.get(effectiveSource)! : null;
  const targetIndex = effectiveTarget ? structure.index.get(effectiveTarget)! : null;

  const compatibility = useMemo(() => {
    const q = { source: sourceIndex, target: targetIndex };
    return Object.fromEntries(
      GRAPH_ALGORITHM_IDS.map((id) => [id, GRAPH_ALGORITHMS[id].check(structure.analysis, q)])
    ) as Record<GraphAlgorithmId, Compatibility>;
  }, [structure, sourceIndex, targetIndex]);

  const selectedIds = GRAPH_ALGORITHM_IDS.filter((id) => selected[id]);
  const runnable = selectedIds.filter((id) => compatibility[id].ok);
  const samplesValue = Number(samples);
  const samplesValid = Number.isInteger(samplesValue) && samplesValue >= 1 && samplesValue <= 20;

  // Resultados só valem para o grafo e a consulta em que foram calculados.
  const currentKey = `${signature}|${effectiveSource}|${effectiveTarget}`;
  const visibleResults = runKey === currentKey ? results : [];
  const stale = runKey !== null && runKey !== currentKey && results.length > 0;

  const selectedResult = visibleResults.find((r) => r.algorithmId === selectedResultId) ?? visibleResults[0] ?? null;
  const highlight = useMemo<GraphHighlight | null>(() => {
    const path = selectedResult?.target?.path;
    if (!path || path.length === 0) return null;
    const ids = path.map((v) => structure.ids[v]);
    const arcs = new Set<string>();
    for (let i = 1; i < ids.length; i++) arcs.add(`${ids[i - 1]}>${ids[i]}`);
    return { nodes: new Set(ids), arcs, color: PATH_COLOR };
  }, [selectedResult, structure]);

  // ---- ações do grafo
  const loadGraph = (newNodes: Node[], newEdges: Edge[], source: string | null, target: string | null) => {
    cancelRef.current?.();
    cancelRef.current = null;
    setProgress(null);
    setNodes(newNodes);
    setEdges(newEdges);
    setCounter(nextNodeCounterFromNodes(newNodes));
    setSourceId(source);
    setTargetId(target);
    setResults([]);
    setRunKey(null);
    setViewKey((k) => k + 1);
  };

  const handleDownload = () => {
    const blob = new Blob([serializeGraphToJson(nodes, edges)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grafo${GRAPH_FILE_EXTENSION}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- execução
  const handleRun = () => {
    if (sourceIndex == null) {
      toast.warning("Adicione vértices e escolha a origem.");
      return;
    }
    if (!samplesValid) {
      toast.warning("Amostras deve ser um inteiro entre 1 e 20.");
      return;
    }
    if (runnable.length === 0) {
      toast.warning("Nenhum algoritmo selecionado é compatível com este grafo/consulta.");
      return;
    }
    // Uma instância (com as posições atuais, usadas pelo A*), copiada para cada worker.
    const eg = editorToGraph(nodes, edges);
    const instance = buildInstance(eg.graph, eg.positions);
    const query = { source: sourceIndex, target: targetIndex };
    const ids = runnable;
    setResults([]);
    setSkipped(
      selectedIds.flatMap((id) => {
        const c = compatibility[id];
        return c.ok ? [] : [{ algorithmId: id, reason: c.reason }];
      })
    );
    setRunKey(currentKey);
    setSelectedResultId(null);
    setProgress({ label: GRAPH_ALGORITHMS[ids[0]].label, done: 0, total: ids.length });
    let done = 0;
    cancelRef.current = runGraphRequests(
      ids.map((algorithmId) => ({ type: "run", instance, query, job: { algorithmId, samples: samplesValue } })),
      {
        onMessage: (msg, index) => {
          done++;
          if (msg.type === "result") setResults((r) => [...r, msg.result]);
          else if (msg.type === "error") toast.error(`${GRAPH_ALGORITHMS[ids[index]].label}: ${msg.message}`);
          const next = ids[index + 1];
          setProgress(next ? { label: GRAPH_ALGORITHMS[next].label, done, total: ids.length } : null);
        },
        onDone: () => {
          cancelRef.current = null;
          setProgress(null);
        },
        onFatal: (m) => {
          cancelRef.current = null;
          setProgress(null);
          toast.error(`Erro ao executar: ${m}`);
        },
      }
    );
  };

  const handleCancel = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setProgress(null);
    toast.info("Execução cancelada; resultados concluídos foram mantidos.");
  };

  const nodeOptions = nodes.map((n, i) => (
    <option key={n.id} value={n.id}>
      {labels[i]}
    </option>
  ));

  return (
    <PageContent>
      <CreateGraphContainer>
        <p>
          Monte um grafo livremente — direcionado, não direcionado ou misto, conexo ou não, com pesos positivos, zero ou
          negativos — e compare algoritmos de caminho mínimo. O benchmark identifica quais algoritmos podem rodar em cada
          grafo e explica por quê.
        </p>
        <Divider />
        <h2>Crie seu grafo</h2>
        <OptionsWrapper>
          <OptionBox isSelected={view === "editor"}>
            <RadioLabel>
              <HiddenRadio name="graphView" value="editor" checked={view === "editor"} onChange={() => setView("editor")} />
              <CustomRadio />
              <p>Editor visual</p>
            </RadioLabel>
            <p>Desenhe nós e arestas ou gere um modelo pronto</p>
          </OptionBox>
          <OptionBox isSelected={view === "import"}>
            <RadioLabel>
              <HiddenRadio name="graphView" value="import" checked={view === "import"} onChange={() => setView("import")} />
              <CustomRadio />
              <p>Importar arquivo</p>
            </RadioLabel>
            <p>Carregue um grafo a partir de um arquivo JSON</p>
          </OptionBox>
        </OptionsWrapper>

        {view === "editor" ? (
          <GraphEditor
            nodes={nodes}
            edges={edges}
            setNodes={setNodes}
            setEdges={setEdges}
            createNodeId={() => {
              const id = counter;
              setCounter(id + 1);
              return { id: `node-${id}`, label: String(id) };
            }}
            sourceId={effectiveSource}
            targetId={effectiveTarget}
            onSetSource={setSourceId}
            onSetTarget={setTargetId}
            highlight={highlight}
            viewKey={viewKey}
            onOpenPresets={() => setPresetOpen(true)}
            onDownload={handleDownload}
            onClearAll={() => loadGraph([], [], null, null)}
          />
        ) : (
          <GraphImportPanel
            onImport={(n, e, fileName) => {
              loadGraph(n, e, n[0]?.id ?? null, null);
              setView("editor");
              toast.success(`Grafo importado de ${fileName}.`);
            }}
          />
        )}

        <GraphProperties analysis={structure.analysis} labels={labels} danglingEdges={structure.danglingEdges} />

        <PresetGraphModal
          open={presetOpen}
          onClose={() => setPresetOpen(false)}
          onApply={(gen, description) => {
            const { nodes: n, edges: e } = generatedToEditor(gen);
            loadGraph(n, e, n[0]?.id ?? null, n.length > 1 ? n[n.length - 1].id : null);
            setView("editor");
            toast.success(description);
          }}
        />
      </CreateGraphContainer>

      <SectionContainer>
        <h2>Consulta e algoritmos</h2>
        <ControlsRow>
          <NumberField as="div">
            <SourceLabel htmlFor="graph-source">Origem</SourceLabel>
            <SourceSelect
              id="graph-source"
              value={effectiveSource ?? ""}
              onChange={(e) => setSourceId(e.target.value)}
              disabled={nodes.length === 0}
            >
              {nodeOptions}
            </SourceSelect>
          </NumberField>
          <NumberField as="div">
            <SourceLabel htmlFor="graph-target">Destino (opcional)</SourceLabel>
            <SourceSelect
              id="graph-target"
              value={effectiveTarget ?? ""}
              onChange={(e) => setTargetId(e.target.value || null)}
              disabled={nodes.length === 0}
            >
              <option value="">— nenhum —</option>
              {nodeOptions}
            </SourceSelect>
          </NumberField>
          <NumberField>
            Amostras de tempo
            <input type="number" min={1} max={20} value={samples} onChange={(e) => setSamples(e.target.value)} />
          </NumberField>
        </ControlsRow>
        <FieldHint>
          O destino habilita as buscas origem → destino e destaca o caminho no grafo. Cada algoritmo roda em um Web Worker
          próprio, com aquecimento não medido e {samplesValid ? samplesValue : "N"} amostra(s) de ≥ 2 ms; o tempo exibido é
          a mediana por execução. Memória não é medida: o navegador não oferece medição confiável por execução.
        </FieldHint>

        <GraphAlgorithmPicker
          selected={selected}
          compatibility={compatibility}
          onToggle={(id, checked) => setSelected((s) => ({ ...s, [id]: checked }))}
          disabled={!!progress}
        />

        <ControlsRow>
          <StartBenchmarkButton
            type="button"
            style={{ flex: 1, width: "auto" }}
            onClick={handleRun}
            disabled={!!progress || runnable.length === 0 || !samplesValid}
          >
            {progress
              ? `Executando ${progress.label}… (${progress.done}/${progress.total} concluído(s))`
              : `Executar ${runnable.length} algoritmo(s) compatível(is)`}
          </StartBenchmarkButton>
          {progress ? (
            <ActionButton type="button" $variant="secondary" onClick={handleCancel}>
              Cancelar
            </ActionButton>
          ) : (
            <ActionButton
              type="button"
              $variant="secondary"
              disabled={results.length === 0}
              onClick={() => {
                setResults([]);
                setRunKey(null);
              }}
            >
              Limpar resultados
            </ActionButton>
          )}
        </ControlsRow>
        {selectedIds.length > runnable.length && (
          <FieldHint>
            {selectedIds.length - runnable.length} algoritmo(s) marcado(s) está(ão) indisponível(is) neste grafo/consulta (o
            motivo aparece no cartão) e não será(ão) executado(s).
          </FieldHint>
        )}
        {stale && (
          <FieldHint style={{ color: "#fbbf24" }}>
            O grafo, a origem ou o destino mudaram desde a última execução: os resultados anteriores foram ocultados.
            Execute novamente.
          </FieldHint>
        )}
      </SectionContainer>

      {visibleResults.length > 0 && sourceIndex != null && (
        <SectionContainer>
          <h2>Resultados</h2>
          <BenchmarkParagraph>
            Mesmo grafo e mesma consulta para todos. Clique em uma linha para ver os detalhes do algoritmo e destacar o
            caminho que ele encontrou no grafo acima.
          </BenchmarkParagraph>
          <GraphResults
            results={visibleResults}
            skipped={skipped}
            labels={labels}
            sourceIndex={sourceIndex}
            targetIndex={targetIndex}
            selectedId={selectedResult?.algorithmId ?? null}
            onSelect={setSelectedResultId}
          />
        </SectionContainer>
      )}

      <SectionContainer>
        <h2>Curva de crescimento</h2>
        <GraphGrowthCurve />
      </SectionContainer>

      <EmptySectionContainer />
    </PageContent>
  );
}

export default GraphBenchmark;
