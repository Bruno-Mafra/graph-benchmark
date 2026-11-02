import type { GraphQuery } from "../algorithms/types";
import type { GraphInstance } from "../types";
import { runGraphJob, runGrowthJob } from "./runner";
import type { GraphJob, GraphRunResult, GrowthJob, GrowthPoint } from "./runner";

export type GraphWorkerRequest =
  | { type: "run"; instance: GraphInstance; query: GraphQuery; job: GraphJob }
  | { type: "growth"; job: GrowthJob };

export type GraphWorkerMessage =
  | { type: "result"; result: GraphRunResult }
  | { type: "growthPoint"; point: GrowthPoint }
  | { type: "error"; message: string }
  | { type: "done" };

/** Tipagem mínima do escopo do worker (o tsconfig usa a lib DOM). */
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<GraphWorkerRequest>) => void) | null;
  postMessage: (message: GraphWorkerMessage, transfer?: Transferable[]) => void;
};

ctx.onmessage = (e) => {
  const req = e.data;
  try {
    if (req.type === "run") {
      const result = runGraphJob(req.instance, req.query, req.job);
      const transfer: Transferable[] = [];
      if (result.sourceDistances) transfer.push(result.sourceDistances.buffer);
      if (result.sourcePrev) transfer.push(result.sourcePrev.buffer);
      ctx.postMessage({ type: "result", result }, transfer);
    } else {
      runGrowthJob(req.job, (point) => ctx.postMessage({ type: "growthPoint", point }));
    }
  } catch (err) {
    ctx.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
  ctx.postMessage({ type: "done" });
};
