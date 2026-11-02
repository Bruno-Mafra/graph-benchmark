import type { MazeGrid } from "./model";
import { runJobsSync } from "./runner";
import type { MazeJob, RunnerEvent } from "./runner";
import type { WorkerMessage, WorkerRequest } from "./solver.worker";
import { runSequentialWorkers } from "../benchmark/sequentialWorkers";

export type RunHandlers = {
  onEvent: (event: RunnerEvent) => void;
  onDone: () => void;
  onFatal: (message: string) => void;
};

/**
 * Executa os jobs fora da thread da interface, um Web Worker novo por
 * algoritmo (ver `runSequentialWorkers`), emitindo eventos conforme cada
 * algoritmo termina. Devolve uma função de cancelamento.
 * Sem suporte a Worker, cai para execução síncrona após um frame.
 */
export function runJobsInBackground(grid: MazeGrid, jobs: MazeJob[], handlers: RunHandlers): () => void {
  if (typeof Worker === "undefined") {
    let cancelled = false;
    const timer = setTimeout(() => {
      runJobsSync(grid, jobs, (e) => !cancelled && handlers.onEvent(e));
      if (!cancelled) handlers.onDone();
    }, 30);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }

  return runSequentialWorkers<WorkerRequest, WorkerMessage>(
    () => new Worker(new URL("./solver.worker.ts", import.meta.url), { type: "module" }),
    jobs.map((job) => ({ grid, jobs: [job] })),
    (msg) => msg.type === "done",
    {
      onMessage: (msg) => {
        if (msg.type !== "done") handlers.onEvent(msg);
      },
      onDone: handlers.onDone,
      onFatal: handlers.onFatal,
    }
  );
}
