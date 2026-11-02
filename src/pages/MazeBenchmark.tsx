import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "react-toastify";
import MazeCanvas from "../components/MazeCanvas/MazeCanvas";
import { MAZE_COLORS } from "../components/MazeCanvas/styles";
import MazeAlgorithmPicker from "../components/MazeAlgorithmPicker/MazeAlgorithmPicker";
import type { ParamErrors, ParamInputs } from "../components/MazeAlgorithmPicker/MazeAlgorithmPicker";
import MazeResultsView from "../components/MazeResults/MazeResultsView";
import MazeComparison from "../components/MazeComparison/MazeComparison";
import { MAZE_LIMITS, clampMazeSize, isLargeGrid } from "../maze/config";
import { generateMaze, randomIntInclusive } from "../maze/generator";
import { countWalls, validateEndpoints } from "../maze/model";
import type { MazeEditMode } from "../maze/model";
import { effectiveView, initMazeState, mazeReducer } from "../maze/mazeState";
import { MAZE_ALGORITHMS, MAZE_ALGORITHM_IDS } from "../maze/algorithms/registry";
import { validateParams } from "../maze/algorithms/params";
import { referenceOptimalCost } from "../maze/algorithms/stats";
import type { MazeAlgorithmId } from "../maze/algorithms/types";
import { buildJobs } from "../maze/runner";
import { runJobsInBackground } from "../maze/runnerClient";
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
} from "./styles";
import {
  ControlsRow,
  NumberField,
  FieldHint,
  ActionButton,
  Toolbar,
  ToolGroup,
  ToolGroupLabel,
  ModeButton,
  Legend,
  LegendItem,
  GridStats,
  InfoBanner,
  StatusBanner,
} from "./mazeStyles";

const EDIT_MODES: { id: MazeEditMode; label: string; swatch: string }[] = [
  { id: "wall", label: "Obstáculo", swatch: MAZE_COLORS.wall },
  { id: "erase", label: "Apagar", swatch: MAZE_COLORS.empty },
  { id: "start", label: "Início", swatch: MAZE_COLORS.start },
  { id: "goal", label: "Destino", swatch: MAZE_COLORS.goal },
];

const ZOOM_LEVELS = [1, 2, 4, 8];

const DEFAULT_SELECTION: Record<MazeAlgorithmId, boolean> = {
  dijkstra: true,
  bfs: true,
  bidirectionalBfs: false,
  astar: true,
  greedy: true,
  aco: false,
  ga: false,
};

const fmt = (n: number) => n.toLocaleString("pt-BR");

function parseSize(value: string, max: number = MAZE_LIMITS.maxSize): number {
  return clampMazeSize(Number(value), max);
}

type Progress = { algorithmId: MazeAlgorithmId; run: number; runs: number; done: number; total: number };

function MazeBenchmark() {
  const [state, dispatch] = useReducer(
    mazeReducer,
    MAZE_LIMITS.defaultManualSize,
    initMazeState
  );
  const { grid, results } = state;

  const [createMode, setCreateMode] = useState<"manual" | "random">("manual");
  const [manualSize, setManualSize] = useState(String(MAZE_LIMITS.defaultManualSize));
  const [randomMin, setRandomMin] = useState(String(MAZE_LIMITS.defaultRandomMin));
  const [randomMax, setRandomMax] = useState(String(MAZE_LIMITS.defaultRandomMax));
  const [editMode, setEditMode] = useState<MazeEditMode>("wall");
  const [zoom, setZoom] = useState(1);
  const [selectedAlgorithms, setSelectedAlgorithms] = useState(DEFAULT_SELECTION);
  const [paramInputs, setParamInputs] = useState<ParamInputs>({});
  const [progress, setProgress] = useState<Progress | null>(null);
  const running = progress !== null;
  const cancelRef = useRef<(() => void) | null>(null);
  /** Modo efetivo do gesto atual (clicar num obstáculo no modo "Obstáculo" o remove). */
  const gestureModeRef = useRef<MazeEditMode>("wall");

  useEffect(() => () => cancelRef.current?.(), []);

  const large = isLargeGrid(grid.size);
  const editable = !large && !running;
  const wallCount = useMemo(() => countWalls(grid), [grid]);
  const endpointsError = validateEndpoints(grid);
  const selectedIds = MAZE_ALGORITHM_IDS.filter((id) => selectedAlgorithms[id]);

  const validated = useMemo(() => {
    const params: Partial<Record<MazeAlgorithmId, Record<string, number>>> = {};
    const errors: ParamErrors = {};
    for (const id of MAZE_ALGORITHM_IDS) {
      const v = validateParams(MAZE_ALGORITHMS[id].params, paramInputs[id] ?? {});
      params[id] = v.params;
      if (Object.keys(v.errors).length) errors[id] = v.errors;
    }
    return { params, errors };
  }, [paramInputs]);
  const selectedWithErrors = selectedIds.filter((id) => validated.errors[id]);
  const slowSelected = large && selectedIds.some((id) => MAZE_ALGORITHMS[id].stochastic);

  const optimal = referenceOptimalCost(results);
  const dijkstraRan = results.some((r) => r.algorithmId === "dijkstra");
  const view = effectiveView(state);

  const manualSizeValue = Number(manualSize);
  const manualSizeValid =
    Number.isInteger(manualSizeValue) &&
    manualSizeValue >= MAZE_LIMITS.minSize &&
    manualSizeValue <= MAZE_LIMITS.largeGridThreshold;

  const handleCreateEmpty = () => {
    if (!manualSizeValid) {
      toast.warning(
        `Para criação manual, use N entre ${MAZE_LIMITS.minSize} e ${MAZE_LIMITS.largeGridThreshold}.`
      );
      return;
    }
    dispatch({ type: "reset", size: manualSizeValue });
    setZoom(1);
  };

  const handleGenerate = () => {
    let min = parseSize(randomMin);
    let max = parseSize(randomMax);
    if (min > max) [min, max] = [max, min];
    setRandomMin(String(min));
    setRandomMax(String(max));
    const size = randomIntInclusive(min, max);
    dispatch({ type: "load", grid: generateMaze(size) });
    setZoom(1);
    toast.success(
      isLargeGrid(size)
        ? `Labirinto ${size} × ${size} gerado (grid grande: edição desabilitada).`
        : `Labirinto ${size} × ${size} gerado.`
    );
  };

  const handleCellPaint = (index: number, first: boolean) => {
    if (first) {
      gestureModeRef.current =
        editMode === "wall" && grid.walls[index] === 1 ? "erase" : editMode;
    }
    dispatch({ type: "editCell", mode: gestureModeRef.current, index });
  };

  const handleRun = () => {
    if (endpointsError) {
      toast.warning(endpointsError);
      return;
    }
    if (selectedIds.length === 0) {
      toast.warning("Selecione pelo menos um algoritmo.");
      return;
    }
    if (selectedWithErrors.length > 0) {
      toast.warning(
        `Corrija os parâmetros de ${selectedWithErrors.map((id) => MAZE_ALGORITHMS[id].label).join(", ")}.`
      );
      return;
    }

    // Todos os algoritmos recebem exatamente esta instância (copiada para o worker).
    const target = grid;
    const jobs = buildJobs(selectedIds, validated.params);
    let done = 0;
    let anyNoPath = false;
    dispatch({ type: "startRun" });
    setProgress({ algorithmId: jobs[0].algorithmId, run: 0, runs: jobs[0].seeds.length, done, total: jobs.length });

    cancelRef.current = runJobsInBackground(target, jobs, {
      onEvent: (event) => {
        if (event.type === "progress") {
          setProgress({ algorithmId: event.algorithmId, run: event.run, runs: event.runs, done, total: jobs.length });
        } else if (event.type === "result") {
          done++;
          if (event.result.status === "no-path") anyNoPath = true;
          dispatch({ type: "addResult", result: event.result });
        } else {
          done++;
          toast.error(`${MAZE_ALGORITHMS[event.algorithmId].label}: ${event.message}`);
        }
      },
      onDone: () => {
        cancelRef.current = null;
        setProgress(null);
        if (anyNoPath) toast.warning("Algum algoritmo não encontrou caminho entre o início e o destino.");
      },
      onFatal: (message) => {
        cancelRef.current = null;
        setProgress(null);
        toast.error(`Erro ao executar os algoritmos: ${message}`);
      },
    });
  };

  const handleCancel = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setProgress(null);
    toast.info("Execução cancelada. Resultados já concluídos foram mantidos.");
  };

  const handleCreateModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCreateMode(e.target.value as "manual" | "random");
  };

  return (
    <PageContent>
      <CreateGraphContainer>
        <p>
          Monte um labirinto em grid, escolha início e destino e compare como diferentes
          algoritmos o resolvem. Cada célula livre é um vértice, ligado às vizinhas de cima,
          baixo, esquerda e direita (sem diagonais), com custo 1 por movimento.
        </p>
        <Divider />
        <h2>Crie seu labirinto</h2>
        <OptionsWrapper>
          <OptionBox isSelected={createMode === "manual"}>
            <RadioLabel>
              <HiddenRadio
                name="mazeCreateMode"
                value="manual"
                checked={createMode === "manual"}
                onChange={handleCreateModeChange}
              />
              <CustomRadio />
              <p>Criar manualmente</p>
            </RadioLabel>
            <p>
              Grid vazio de até {MAZE_LIMITS.largeGridThreshold} ×{" "}
              {MAZE_LIMITS.largeGridThreshold} para desenhar obstáculos
            </p>
          </OptionBox>
          <OptionBox isSelected={createMode === "random"}>
            <RadioLabel>
              <HiddenRadio
                name="mazeCreateMode"
                value="random"
                checked={createMode === "random"}
                onChange={handleCreateModeChange}
              />
              <CustomRadio />
              <p>Gerar aleatoriamente</p>
            </RadioLabel>
            <p>
              Labirinto com corredores e bifurcações, de até {MAZE_LIMITS.maxSize} ×{" "}
              {MAZE_LIMITS.maxSize}
            </p>
          </OptionBox>
        </OptionsWrapper>

        {createMode === "manual" ? (
          <ControlsRow>
            <NumberField>
              Tamanho N (N × N)
              <input
                type="number"
                min={MAZE_LIMITS.minSize}
                max={MAZE_LIMITS.largeGridThreshold}
                value={manualSize}
                onChange={(e) => setManualSize(e.target.value)}
              />
            </NumberField>
            <ActionButton type="button" onClick={handleCreateEmpty} disabled={running}>
              Criar grid vazio
            </ActionButton>
            <FieldHint>
              {manualSizeValid
                ? "Substitui o labirinto atual por um grid sem obstáculos."
                : `N deve estar entre ${MAZE_LIMITS.minSize} e ${MAZE_LIMITS.largeGridThreshold}. Grids maiores só podem ser gerados aleatoriamente.`}
            </FieldHint>
          </ControlsRow>
        ) : (
          <ControlsRow>
            <NumberField>
              N mínimo
              <input
                type="number"
                min={MAZE_LIMITS.minSize}
                max={MAZE_LIMITS.maxSize}
                value={randomMin}
                onChange={(e) => setRandomMin(e.target.value)}
              />
            </NumberField>
            <NumberField>
              N máximo
              <input
                type="number"
                min={MAZE_LIMITS.minSize}
                max={MAZE_LIMITS.maxSize}
                value={randomMax}
                onChange={(e) => setRandomMax(e.target.value)}
              />
            </NumberField>
            <ActionButton type="button" onClick={handleGenerate} disabled={running}>
              Gerar labirinto aleatório
            </ActionButton>
            <FieldHint>
              N é sorteado entre os limites ({MAZE_LIMITS.minSize}–{MAZE_LIMITS.maxSize}).
              Acima de {MAZE_LIMITS.largeGridThreshold} o grid é grande e não editável.
            </FieldHint>
          </ControlsRow>
        )}

        <Divider />

        <Toolbar>
          <ToolGroup>
            <ToolGroupLabel>Editar</ToolGroupLabel>
            {EDIT_MODES.map((m) => (
              <ModeButton
                key={m.id}
                type="button"
                $active={editMode === m.id}
                $swatch={m.swatch}
                aria-pressed={editMode === m.id}
                disabled={!editable}
                onClick={() => setEditMode(m.id)}
              >
                {m.label}
              </ModeButton>
            ))}
          </ToolGroup>
          <ToolGroup>
            <ActionButton
              type="button"
              $variant="secondary"
              disabled={!editable || wallCount === 0}
              onClick={() => dispatch({ type: "clearWalls" })}
            >
              Limpar obstáculos
            </ActionButton>
            <ActionButton
              type="button"
              $variant="secondary"
              disabled={!editable}
              onClick={() => dispatch({ type: "reset", size: grid.size })}
            >
              Reiniciar
            </ActionButton>
          </ToolGroup>
        </Toolbar>

        {large ? (
          <InfoBanner>
            <strong>Grid grande ({grid.size} × {grid.size}).</strong> A edição célula
            por célula fica desabilitada acima de {MAZE_LIMITS.largeGridThreshold} ×{" "}
            {MAZE_LIMITS.largeGridThreshold}. Use o zoom para navegar; os caminhos são
            reforçados com uma linha quando as células ficam pequenas demais.
          </InfoBanner>
        ) : (
          <BenchmarkParagraph>
            Escolha um modo e clique (ou arraste) sobre as células. No modo{" "}
            <strong>Obstáculo</strong>, clicar em um obstáculo existente o remove.
            Obstáculos não podem ficar sobre o início ou o destino. Os caminhos encontrados
            aparecem na seção <strong>Caminhos encontrados</strong>.
          </BenchmarkParagraph>
        )}

        <ToolGroup>
          <ToolGroupLabel>Zoom</ToolGroupLabel>
          {ZOOM_LEVELS.map((z) => (
            <ModeButton
              key={z}
              type="button"
              $active={zoom === z}
              aria-pressed={zoom === z}
              onClick={() => setZoom(z)}
            >
              {z === 1 ? "Ajustar" : `${z}×`}
            </ModeButton>
          ))}
        </ToolGroup>

        <MazeCanvas
          grid={grid}
          result={null}
          showExplored={false}
          zoom={zoom}
          editable={editable}
          onCellPaint={handleCellPaint}
        />

        <Toolbar>
          <Legend>
            <LegendItem $color={MAZE_COLORS.empty}>Livre</LegendItem>
            <LegendItem $color={MAZE_COLORS.wall}>Obstáculo</LegendItem>
            <LegendItem $color={MAZE_COLORS.start} $round>Início</LegendItem>
            <LegendItem $color={MAZE_COLORS.goal} $round>Destino</LegendItem>
            <LegendItem $color={MAZE_COLORS.explored}>Explorada</LegendItem>
            <LegendItem $color={MAZE_COLORS.path}>Caminho</LegendItem>
          </Legend>
          <GridStats>
            {grid.size} × {grid.size} · {fmt(grid.size * grid.size)} células ·{" "}
            {fmt(wallCount)} obstáculos
          </GridStats>
        </Toolbar>
      </CreateGraphContainer>

      <SectionContainer>
        <h2>Algoritmos</h2>
        <BenchmarkParagraph>
          Selecione um ou mais algoritmos. Todos rodam sobre exatamente o mesmo labirinto
          (grid, início, destino e obstáculos), fora da thread da interface. O tempo mede só
          a busca. O consumo de memória não é exibido: o navegador não oferece uma medição
          confiável por execução.
        </BenchmarkParagraph>

        <MazeAlgorithmPicker
          selected={selectedAlgorithms}
          onToggle={(id, checked) => setSelectedAlgorithms((s) => ({ ...s, [id]: checked }))}
          paramInputs={paramInputs}
          paramErrors={validated.errors}
          onParamChange={(id, key, value) =>
            setParamInputs((p) => ({ ...p, [id]: { ...p[id], [key]: value } }))
          }
          disabled={running}
        />

        {endpointsError && <StatusBanner $ok={false}>{endpointsError}</StatusBanner>}
        {slowSelected && (
          <InfoBanner>
            ACO e GA em grids grandes podem levar vários segundos por execução (multiplicado
            pelo número de execuções). A interface continua responsiva e é possível cancelar.
          </InfoBanner>
        )}

        <FieldHint>
          Selecionados ({selectedIds.length}):{" "}
          {selectedIds.length
            ? selectedIds.map((id) => MAZE_ALGORITHMS[id].label).join(", ")
            : "nenhum"}
        </FieldHint>

        <ControlsRow>
          <StartBenchmarkButton
            type="button"
            style={{ flex: 1, width: "auto" }}
            onClick={handleRun}
            disabled={running || !!endpointsError || selectedIds.length === 0 || selectedWithErrors.length > 0}
          >
            {running
              ? `Executando ${MAZE_ALGORITHMS[progress.algorithmId].label}${
                  progress.runs > 1 ? ` (execução ${Math.min(progress.run + 1, progress.runs)}/${progress.runs})` : ""
                }… ${progress.done}/${progress.total} concluído(s)`
              : selectedIds.length > 1
                ? `Executar ${selectedIds.length} algoritmos`
                : "Resolver labirinto"}
          </StartBenchmarkButton>
          {running ? (
            <ActionButton type="button" $variant="secondary" onClick={handleCancel}>
              Cancelar
            </ActionButton>
          ) : (
            <ActionButton
              type="button"
              $variant="secondary"
              disabled={results.length === 0}
              onClick={() => dispatch({ type: "clearResults" })}
            >
              Limpar resultados
            </ActionButton>
          )}
        </ControlsRow>
      </SectionContainer>

      {results.length > 0 && (
        <SectionContainer>
          <h2>Caminhos encontrados</h2>
          <BenchmarkParagraph>
            {view === "grid"
              ? "Um labirinto por algoritmo. Clique em um deles para ampliá-lo e ver suas métricas."
              : "Escolha o algoritmo acima para trocar o caminho exibido, sem executar de novo."}
          </BenchmarkParagraph>
          <MazeResultsView
            grid={grid}
            results={results}
            selectedId={state.selectedId}
            view={view}
            optimal={optimal}
            onSelect={(id) => dispatch({ type: "selectResult", algorithmId: id })}
            onShowGrid={() => dispatch({ type: "setView", view: "grid" })}
          />
        </SectionContainer>
      )}

      {results.length > 0 && (
        <SectionContainer>
          <h2>Comparação de algoritmos</h2>
          <BenchmarkParagraph>
            Resultados de todos os algoritmos executados neste labirinto. Clique em uma linha
            para ver o caminho correspondente.
          </BenchmarkParagraph>
          <MazeComparison
            results={results}
            optimal={optimal}
            dijkstraRan={dijkstraRan}
            selectedId={view === "single" ? state.selectedId : null}
            onSelect={(id) => dispatch({ type: "selectResult", algorithmId: id })}
          />
        </SectionContainer>
      )}

      <EmptySectionContainer></EmptySectionContainer>
    </PageContent>
  );
}

export default MazeBenchmark;
