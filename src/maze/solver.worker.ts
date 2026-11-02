import type { MazeGrid } from "./model";
import { runJobsSync } from "./runner";
import type { MazeJob, RunnerEvent } from "./runner";

export type WorkerRequest = { grid: MazeGrid; jobs: MazeJob[] };
export type WorkerMessage = RunnerEvent | { type: "done" };

/** Tipagem mínima do escopo do worker (o tsconfig usa a lib DOM). */
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerMessage, transfer?: Transferable[]) => void;
};

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  // O grid chega por cópia (structured clone): o labirinto da interface nunca é tocado.
  const { grid, jobs } = e.data;
  runJobsSync(grid, jobs, (event) => {
    if (event.type === "result") {
      ctx.postMessage(event satisfies WorkerMessage, [event.result.explored.buffer]);
    } else {
      ctx.postMessage(event satisfies WorkerMessage);
    }
  });
  ctx.postMessage({ type: "done" } satisfies WorkerMessage);
};
