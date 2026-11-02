import { runSequentialWorkers } from "../../benchmark/sequentialWorkers";
import type { GraphWorkerMessage, GraphWorkerRequest } from "./graph.worker";

export type GraphRunHandlers = {
  onMessage: (message: Exclude<GraphWorkerMessage, { type: "done" }>, index: number) => void;
  onDone: () => void;
  onFatal: (message: string) => void;
};

/**
 * Executa as requisições fora da thread da interface, um Web Worker novo por
 * algoritmo (mesmas condições de JIT para todos). Devolve o cancelamento.
 */
export function runGraphRequests(requests: GraphWorkerRequest[], handlers: GraphRunHandlers): () => void {
  return runSequentialWorkers<GraphWorkerRequest, GraphWorkerMessage>(
    () => new Worker(new URL("./graph.worker.ts", import.meta.url), { type: "module" }),
    requests,
    (msg) => msg.type === "done",
    {
      onMessage: (msg, index) => {
        if (msg.type !== "done") handlers.onMessage(msg, index);
      },
      onDone: handlers.onDone,
      onFatal: handlers.onFatal,
    }
  );
}
