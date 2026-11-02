/**
 * Orquestra os experimentos: um processo Node novo por algoritmo (isolamento
 * de JIT, como os Web Workers da interface), um após o outro (sem competir por
 * CPU). Grava os resultados brutos em docs/experimentos/dados/.
 *
 * Uso: node scripts/experiments/run.mjs [graph|maze]   (padrão: ambos)
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const GRAPH_IDS = ["dijkstra", "bellmanFord", "bfs", "dagShortestPath", "duanSssp", "dijkstraTarget", "astar", "bidirectionalDijkstra", "floydWarshall", "johnson"];
const MAZE_IDS = ["dijkstra", "bfs", "bidirectionalBfs", "astar", "greedy", "aco", "ga"];

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const outDir = path.join(root, "docs/experimentos/dados");
mkdirSync(outDir, { recursive: true });
const viteNode = path.join(root, "node_modules/.bin/vite-node");
const only = process.argv[2];

function runAll(kind, ids) {
  const results = [];
  for (const id of ids) {
    const t0 = Date.now();
    const p = spawnSync(viteNode, ["scripts/experiments/runAlgorithm.ts", "--", kind, id], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 512,
    });
    if (p.status !== 0) {
      console.error(p.stderr);
      throw new Error(`${kind}/${id} falhou`);
    }
    const lines = p.stdout.split("\n").filter((l) => l.startsWith("RESULT "));
    for (const l of lines) results.push(JSON.parse(l.slice(7)));
    console.log(`${kind}/${id}: ${lines.length} resultados em ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  return results;
}

const environment = {
  date: new Date().toISOString(),
  node: process.version,
  cpu: os.cpus()[0]?.model,
  cores: os.cpus().length,
  platform: `${os.platform()} ${os.release()}`,
  memoryGB: Math.round(os.totalmem() / 2 ** 30),
};

if (!only || only === "graph") writeFileSync(path.join(outDir, "grafos.json"), JSON.stringify({ environment, results: runAll("graph", GRAPH_IDS) }, null, 1));
if (!only || only === "maze") writeFileSync(path.join(outDir, "labirintos.json"), JSON.stringify({ environment, results: runAll("maze", MAZE_IDS) }, null, 1));
