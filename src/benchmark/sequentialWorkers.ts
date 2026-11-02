export type SequentialWorkerHandlers<TMsg> = {
  onMessage: (message: TMsg, index: number) => void;
  onDone: () => void;
  onFatal: (message: string) => void;
};

/**
 * Envia cada requisição a um Web Worker NOVO, um após o outro. Assim cada
 * algoritmo começa com o motor JavaScript no mesmo estado (o JIT aquecido por um
 * não beneficia nem prejudica o seguinte), os algoritmos nunca competem por CPU
 * e a interface não trava. `isFinal` identifica a mensagem que encerra um worker.
 * Devolve uma função de cancelamento.
 */
export function runSequentialWorkers<TReq, TMsg>(
  createWorker: () => Worker,
  requests: TReq[],
  isFinal: (message: TMsg) => boolean,
  handlers: SequentialWorkerHandlers<TMsg>
): () => void {
  let current: Worker | null = null;
  let stopped = false;
  const stop = () => {
    stopped = true;
    current?.terminate();
    current = null;
  };

  const runNext = (index: number) => {
    if (stopped) return;
    if (index >= requests.length) {
      stop();
      handlers.onDone();
      return;
    }
    const worker = createWorker();
    current = worker;
    worker.onmessage = (e: MessageEvent<TMsg>) => {
      if (stopped || worker !== current) return;
      if (isFinal(e.data)) {
        worker.terminate();
        runNext(index + 1);
      } else {
        handlers.onMessage(e.data, index);
      }
    };
    worker.onerror = (e) => {
      if (stopped) return;
      stop();
      handlers.onFatal(e.message || "Falha no worker de execução.");
    };
    // Structured clone: cada worker recebe uma cópia idêntica da instância.
    worker.postMessage(requests[index]);
  };

  runNext(0);
  return () => {
    if (!stopped) stop();
  };
}
