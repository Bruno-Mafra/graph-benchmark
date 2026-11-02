/**
 * ⚠ EXPERIMENTAL — cópia adaptada de `breaking-sorting-barrier/algorithm.ts`
 * (o original não foi alterado). Ver também breaking-sorting-barrier/IMPLEMENTATION.md.
 *
 * Mudanças nesta cópia (todas validadas por teste diferencial contra o
 * original e contra Dijkstra/Bellman-Ford):
 * 1. Alargamento do intervalo K (decisão #3 do IMPLEMENTATION.md) restrito a
 *    vértices que acabaram de melhorar. O original reinseria também vértices já
 *    completos cujo caminho não mudou, reprocessando-os em cascata (~470
 *    expansões por vértice em 3,5 mil vértices; agora ~5). Ganho de ~20–25×.
 * 2. Estrutura do Lemma 3.3 com remoção preguiçosa, busca binária na inserção
 *    e Pull por blocos inteiros (como no artigo).
 * 3. Árvore de predecessores por BFS nos arcos justos: O(V + E) em vez de O(V·E).
 * 4. Contadores de trabalho (`DuanStats`) e entrada como lista de adjacência.
 *
 * POR QUE NÃO ATINGE O(m · log^{2/3} n) NA PRÁTICA (e o que faltaria):
 * - Valores ⟨dist, saltos, vértice⟩ são objetos alocados a cada comparação, e o
 *   estado usa Map/Set: muito mais lento que os arrays tipados do Dijkstra.
 *   → Faltaria representar tudo em arrays tipados e comparar sem alocar.
 * - Divisão de blocos e Pull usam ordenação por comparação (O(M log M)) no
 *   lugar da seleção linear de mediana [BFP+73]; isso devolve um fator log.
 *   → Faltaria seleção em tempo linear (mediana das medianas / introselect).
 * - A estrutura do Lemma 3.3 não tem as garantias amortizadas do artigo
 *   (blocos encadeados com árvore de busca sobre os limites de D1).
 * - A transformação para grau constante é explícita: cria uma "porta" por
 *   vizinho e ciclos de peso 0, dobrando o tamanho do grafo; só compensa com
 *   graus altos. → Faltaria fazê-la de forma implícita ou só quando necessária.
 * - A vantagem é assintótica: log^{2/3} n contra log n é ≈ 2,4× em n = 10⁴ e
 *   ≈ 2,7× em n = 10⁶, antes das constantes. As constantes (recursão,
 *   FindPivots com k rodadas, transformação) são bem maiores que as de uma
 *   heap binária, então nos tamanhos que cabem no navegador não há expectativa
 *   de vencer o Dijkstra mesmo com as melhorias acima.
 * - A corretude é estabelecida empiricamente (teste diferencial), não por prova;
 *   o alargamento de K continua sendo uma divergência do pseudocódigo.
 *
 * ─────────────────────────────────────────────────────────────────────────
 */
/**
 * Deterministic SSSP that breaks the sorting barrier.
 *
 * Faithful implementation of:
 *   Ran Duan, Jiayi Mao, Xiao Mao, Xinkai Shu, Longhui Yin —
 *   "Breaking the Sorting Barrier for Directed Single-Source Shortest Paths" (2025).
 *
 * Implements the constant-degree transformation (§2), and Algorithms 1–3
 * (FindPivots, BaseCase, BMSSP) together with the partial-sorting data structure
 * of Lemma 3.3. See IMPLEMENTATION.md for the article ↔ code mapping and the
 * (few) implementation decisions that the paper leaves open.
 *
 * ── Key correctness ingredient ────────────────────────────────────────────
 * The paper assumes every path has a UNIQUE length (Assumption 2.1) and orders
 * paths by the tuple ⟨length, #hops, reversed vertex sequence⟩. We honour this
 * by representing the "value" of the best known path to a vertex as
 *   Val = ⟨dist, hops, vertex⟩
 * and by using this total order EVERYWHERE a comparison against a bound occurs
 * (relaxation, the interval tests in BMSSP, the boundaries B / Bi / B′, and the
 * ordering inside the data structure). This is essential because the
 * constant-degree transformation introduces zero-weight cycles, so many vertices
 * share the same numeric distance; only the total order disambiguates them and
 * keeps the boundary/interval logic well-defined.
 */

export type Edge = { to: number; weight: number };

export type Graph = {
  n: number;
  adj: Edge[][];
};

export type SSSPResult = {
  distances: number[];
  predecessors: (number | null)[];
};

/** Contadores de trabalho (sobre o grafo TRANSFORMADO, de grau constante). */
export type DuanStats = {
  /** Vértices (portas) cuja lista de saída foi percorrida, somando todas as chamadas. */
  expansions: number;
  edgeScans: number;
  relaxations: number;
  /** Vértices e arcos do grafo transformado. */
  transformedVertices: number;
  transformedArcs: number;
  recursionCalls: number;
  pulls: number;
};

type PathState = {
  dist: number[];
  pred: (number | null)[];
  hops: number[];
  stats: DuanStats;
};

// ---------------------------------------------------------------------------
// Total order over paths (Assumption 2.1)
// ---------------------------------------------------------------------------

/** A path "value": ⟨length, #hops, endpoint⟩, comparable via {@link cmpVal}. */
type Val = { d: number; h: number; v: number };

/** Sentinel greater than every real path value (used for B = ∞). */
const INF_VAL: Val = { d: Infinity, h: 0, v: -1 };

function cmpVal(a: Val, b: Val): number {
  if (a.d !== b.d) return a.d < b.d ? -1 : 1;
  if (a.h !== b.h) return a.h < b.h ? -1 : 1;
  if (a.v !== b.v) return a.v < b.v ? -1 : 1;
  return 0;
}

/** Current best path value recorded for vertex v. */
function valOf(state: PathState, v: number): Val {
  return { d: state.dist[v], h: state.hops[v], v };
}

/** Value of the candidate path s↝u→v (relaxing edge (u,v,weight)). */
function candidateVal(state: PathState, u: number, v: number, weight: number): Val {
  return { d: state.dist[u] + weight, h: state.hops[u] + 1, v };
}

/**
 * Compare candidate path s↝u→v against the current best path to v.
 * <0 strictly better, 0 same path (u is already Pred[v]), >0 strictly worse.
 *
 * Going around a zero-weight cycle keeps d unchanged but increases h, hence is
 * strictly worse — this is what prevents the relaxation from looping forever.
 */
function comparePath(state: PathState, u: number, v: number, weight: number): number {
  const nd = state.dist[u] + weight;
  if (nd !== state.dist[v]) return nd < state.dist[v] ? -1 : 1;
  const nh = state.hops[u] + 1;
  if (nh !== state.hops[v]) return nh < state.hops[v] ? -1 : 1;
  if (state.pred[v] === null) return -1;
  if (u === state.pred[v]) return 0;
  return u < state.pred[v]! ? -1 : 1;
}

/** "≤" test of Remark 3.4: candidate is strictly better, or is the exact same path. */
function betterOrEqual(state: PathState, u: number, v: number, weight: number): boolean {
  return comparePath(state, u, v, weight) <= 0;
}

/**
 * Commit d̂[v]/Pred[v]/hops[v] only when the candidate path is strictly better.
 * Retorna true se houve melhora.
 */
function relaxIfBetter(state: PathState, u: number, v: number, weight: number): boolean {
  if (comparePath(state, u, v, weight) < 0) {
    state.stats.relaxations++;
    state.dist[v] = state.dist[u] + weight;
    state.pred[v] = u;
    state.hops[v] = state.hops[u] + 1;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Parameters (article §3.1): k = ⌊log^{1/3} n⌋, t = ⌊log^{2/3} n⌋ (log base 2).
// Clamped to ≥ 1 so tiny inputs remain well-defined.
// ---------------------------------------------------------------------------

function computeParams(n: number): { k: number; t: number } {
  const logn = Math.log2(Math.max(n, 2));
  const k = Math.max(1, Math.floor(Math.pow(logn, 1 / 3)));
  const t = Math.max(1, Math.floor(Math.pow(logn, 2 / 3)));
  return { k, t };
}

function pow2(exp: number): number {
  if (exp <= 0) return 1;
  if (exp >= 53) return Number.MAX_SAFE_INTEGER;
  return Math.pow(2, exp);
}

// ---------------------------------------------------------------------------
// Constant-degree transformation (§2)
// ---------------------------------------------------------------------------

type TransformedGraph = {
  graph: Graph;
  portsOf: number[][];
  originalOf: number[];
  sourcePort: number;
};

/**
 * Build G′ where every vertex has in/out-degree ≤ 2, preserving shortest-path
 * distances between original vertices. Each original vertex becomes a 0-weight
 * directed cycle of "ports" (one per distinct in/out neighbour); an original
 * edge (u,v,w) becomes x_uv → x_vu with weight w.
 */
function toConstantDegree(graph: Graph, source: number): TransformedGraph {
  const n = graph.n;
  const neighborSets: Set<number>[] = Array.from({ length: n }, () => new Set());
  for (let u = 0; u < n; u++) {
    for (const { to } of graph.adj[u]) {
      neighborSets[u].add(to);
      neighborSets[to].add(u);
    }
  }

  const portsOf: number[][] = Array.from({ length: n }, () => []);
  const originalOf: number[] = [];
  const portIndex: Map<number, number>[] = Array.from({ length: n }, () => new Map());
  let nextId = 0;

  for (let v = 0; v < n; v++) {
    const neighbors = [...neighborSets[v]];
    if (neighbors.length === 0) {
      portsOf[v].push(nextId);
      originalOf.push(v);
      nextId++;
    } else {
      neighbors.forEach((w, i) => {
        portsOf[v].push(nextId);
        originalOf.push(v);
        portIndex[v].set(w, i);
        nextId++;
      });
    }
  }

  const adj: Edge[][] = Array.from({ length: nextId }, () => []);
  const addEdge = (from: number, to: number, weight: number) => adj[from].push({ to, weight });

  for (let v = 0; v < n; v++) {
    const ports = portsOf[v];
    if (ports.length <= 1) continue;
    for (let i = 0; i < ports.length; i++) {
      addEdge(ports[i], ports[(i + 1) % ports.length], 0);
    }
  }

  for (let u = 0; u < n; u++) {
    for (const { to: v, weight } of graph.adj[u]) {
      const iu = portIndex[u].get(v);
      const iv = portIndex[v].get(u);
      if (iu === undefined || iv === undefined) {
        throw new Error("constant-degree transform: missing port");
      }
      addEdge(portsOf[u][iu], portsOf[v][iv], weight);
    }
  }

  return {
    graph: { n: nextId, adj },
    portsOf,
    originalOf,
    sourcePort: portsOf[source][0],
  };
}

// ---------------------------------------------------------------------------
// Lemma 3.3 — block-based partial-sorting structure (values are Val)
// ---------------------------------------------------------------------------

type KV = { key: number; value: Val };
type Block = { items: KV[]; upperBound: Val };

/**
 * Supports Insert / BatchPrepend / Pull as in Lemma 3.3, ordered by {@link cmpVal}.
 *
 * Ajustes em relação à versão original (mesma semântica, menos trabalho):
 * - remoção preguiçosa: `keyValue` é a fonte da verdade; um item só é válido se
 *   `keyValue.get(key) === item.value` (mesmo objeto). Itens obsoletos são
 *   descartados quando o bloco é visitado, em vez de uma busca linear por todos
 *   os blocos a cada remoção (que tornava a estrutura quadrática);
 * - Insert localiza o bloco de D1 por busca binária nos limites superiores;
 * - Pull reúne blocos INTEIROS do início de D0 e D1 até ter ≥ M itens (como no
 *   artigo; cortar no meio de um bloco não ordenado podia perder itens menores)
 *   e calcula o novo limite olhando só o bloco seguinte de cada sequência, em
 *   vez de varrer a estrutura inteira.
 * Ainda usa ordenação por comparação (O(M log M)) para dividir blocos, no lugar
 * da seleção de mediana em tempo linear de [BFP+73].
 */
class PartialSortingDS {
  private readonly M: number;
  private readonly B: Val;
  private readonly D0: Block[] = [];
  /** Ordenada por upperBound; o último bloco (limite B) nunca é removido. */
  private readonly D1: Block[] = [];
  private readonly keyValue = new Map<number, Val>();

  constructor(M: number, B: Val) {
    this.M = Math.max(1, M);
    this.B = B;
    this.D1.push({ items: [], upperBound: B });
  }

  isEmpty(): boolean {
    return this.keyValue.size === 0;
  }

  private isLive(item: KV): boolean {
    return this.keyValue.get(item.key) === item.value;
  }

  private purge(block: Block): void {
    if (block.items.some((it) => !this.isLive(it))) block.items = block.items.filter((it) => this.isLive(it));
  }

  insert(key: number, value: Val): void {
    const existing = this.keyValue.get(key);
    if (existing !== undefined && cmpVal(value, existing) >= 0) return;
    this.keyValue.set(key, value); // o item antigo (se houver) fica obsoleto

    // Primeiro bloco cujo limite superior é ≥ value.
    let lo = 0;
    let hi = this.D1.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cmpVal(this.D1[mid].upperBound, value) >= 0) hi = mid;
      else lo = mid + 1;
    }
    this.D1[lo].items.push({ key, value });
    if (this.D1[lo].items.length > this.M) this.splitD1(lo);
  }

  private splitD1(blockIndex: number): void {
    const block = this.D1[blockIndex];
    this.purge(block);
    if (block.items.length <= this.M) return;
    block.items.sort((a, b) => cmpVal(a.value, b.value));
    const mid = Math.ceil(block.items.length / 2);
    const leftItems = block.items.slice(0, mid);
    const rightItems = block.items.slice(mid);
    this.D1.splice(
      blockIndex,
      1,
      { items: leftItems, upperBound: rightItems[0].value },
      { items: rightItems, upperBound: block.upperBound },
    );
  }

  batchPrepend(pairs: KV[]): void {
    const best = new Map<number, Val>();
    for (const { key, value } of pairs) {
      const prev = best.get(key);
      if (prev === undefined || cmpVal(value, prev) < 0) best.set(key, value);
    }

    const fresh: KV[] = [];
    for (const [key, value] of best) {
      const existing = this.keyValue.get(key);
      if (existing !== undefined && cmpVal(value, existing) >= 0) continue;
      this.keyValue.set(key, value);
      fresh.push({ key, value });
    }
    if (fresh.length === 0) return;

    fresh.sort((a, b) => cmpVal(a.value, b.value));
    const cap = fresh.length <= this.M ? fresh.length : Math.max(1, Math.ceil(this.M / 2));
    const newBlocks: Block[] = [];
    for (let i = 0; i < fresh.length; i += cap) {
      const chunk = fresh.slice(i, i + cap);
      newBlocks.push({ items: chunk, upperBound: chunk[chunk.length - 1].value });
    }
    this.D0.unshift(...newBlocks);
  }

  /**
   * Junta blocos inteiros do início da sequência até ter ≥ M itens válidos,
   * removendo blocos que ficaram vazios. Devolve os itens e o índice do
   * primeiro bloco não coletado.
   */
  private collect(blocks: Block[], keepLast: boolean): { items: KV[]; next: number } {
    const items: KV[] = [];
    let i = 0;
    while (i < blocks.length && items.length < this.M) {
      this.purge(blocks[i]);
      if (blocks[i].items.length === 0 && !(keepLast && i === blocks.length - 1)) {
        blocks.splice(i, 1);
        continue;
      }
      for (const it of blocks[i].items) items.push(it);
      i++;
    }
    return { items, next: i };
  }

  /** Menor valor válido a partir do bloco `from` (blocos posteriores só têm valores maiores). */
  private minFrom(blocks: Block[], from: number): Val | null {
    for (let i = from; i < blocks.length; i++) {
      this.purge(blocks[i]);
      let min: Val | null = null;
      for (const it of blocks[i].items) if (min === null || cmpVal(it.value, min) < 0) min = it.value;
      if (min !== null) return min;
    }
    return null;
  }

  /** Up to M smallest keys plus a separator: max(S′) < bound ≤ min(remaining); B if empty. */
  pull(): { bound: Val; keys: number[] } {
    if (this.keyValue.size === 0) return { bound: this.B, keys: [] };

    const c0 = this.collect(this.D0, false);
    const c1 = this.collect(this.D1, true);
    const candidates = [...c0.items, ...c1.items];
    candidates.sort((a, b) => cmpVal(a.value, b.value));
    const take = candidates.slice(0, Math.min(this.M, candidates.length));
    if (take.length === 0) return { bound: this.B, keys: [] };
    for (const { key } of take) this.keyValue.delete(key);
    if (this.keyValue.size === 0) return { bound: this.B, keys: take.map((p) => p.key) };

    let bound: Val | null = take.length < candidates.length ? candidates[take.length].value : null;
    for (const m of [this.minFrom(this.D0, c0.next), this.minFrom(this.D1, c1.next)]) {
      if (m !== null && (bound === null || cmpVal(m, bound) < 0)) bound = m;
    }
    return { bound: bound ?? this.B, keys: take.map((p) => p.key) };
  }
}

// ---------------------------------------------------------------------------
// Binary min-heap ordered by Val (for BaseCase, Algorithm 2)
// ---------------------------------------------------------------------------

class MinHeap {
  private data: KV[] = [];
  private index = new Map<number, number>();

  get size(): number {
    return this.data.length;
  }

  has(key: number): boolean {
    return this.index.has(key);
  }

  insert(key: number, value: Val): void {
    if (this.index.has(key)) {
      this.decreaseKey(key, value);
      return;
    }
    const i = this.data.length;
    this.data.push({ key, value });
    this.index.set(key, i);
    this.bubbleUp(i);
  }

  decreaseKey(key: number, value: Val): void {
    const i = this.index.get(key);
    if (i === undefined) return;
    if (cmpVal(value, this.data[i].value) >= 0) return;
    this.data[i].value = value;
    this.bubbleUp(i);
  }

  extractMin(): KV | null {
    if (this.data.length === 0) return null;
    const min = this.data[0];
    const last = this.data.pop()!;
    this.index.delete(min.key);
    if (this.data.length > 0) {
      this.data[0] = last;
      this.index.set(last.key, 0);
      this.bubbleDown(0);
    }
    return min;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (cmpVal(this.data[i].value, this.data[p].value) >= 0) break;
      this.swap(i, p);
      i = p;
    }
  }

  private bubbleDown(i: number): void {
    for (;;) {
      let best = i;
      const l = i * 2 + 1;
      const r = i * 2 + 2;
      if (l < this.data.length && cmpVal(this.data[l].value, this.data[best].value) < 0) best = l;
      if (r < this.data.length && cmpVal(this.data[r].value, this.data[best].value) < 0) best = r;
      if (best === i) break;
      this.swap(i, best);
      i = best;
    }
  }

  private swap(i: number, j: number): void {
    const di = this.data[i];
    const dj = this.data[j];
    this.data[i] = dj;
    this.data[j] = di;
    this.index.set(di.key, j);
    this.index.set(dj.key, i);
  }
}

// ---------------------------------------------------------------------------
// Algorithm 1 — FindPivots
// ---------------------------------------------------------------------------

function findPivots(
  graph: Graph,
  state: PathState,
  B: Val,
  S: number[],
  k: number,
): { P: number[]; W: number[] } {
  const Wset = new Set<number>(S);
  let Wprev = [...S];

  for (let i = 0; i < k; i++) {
    const Wi: number[] = [];
    const WiSet = new Set<number>();
    for (const u of Wprev) {
      state.stats.expansions++;
      for (const { to: v, weight } of graph.adj[u]) {
        state.stats.edgeScans++;
        // Algorithm 1 lines 7–10 (Remark 3.4: ≤ under the total order).
        if (betterOrEqual(state, u, v, weight)) {
          relaxIfBetter(state, u, v, weight);
          if (cmpVal(candidateVal(state, u, v, weight), B) < 0) {
            if (!WiSet.has(v)) {
              WiSet.add(v);
              Wi.push(v);
            }
            Wset.add(v);
          }
        }
      }
    }
    Wprev = Wi;
    if (Wset.size > k * S.length) {
      return { P: [...S], W: [...Wset] };
    }
  }

  const W = [...Wset];
  const Win = new Set(W);

  // F = {(u,v) ∈ E : u,v ∈ W and (u,v) is the shortest-path-tree edge into v}.
  const children = new Map<number, number[]>();
  const hasParentInF = new Set<number>();
  for (const u of W) {
    for (const { to: v, weight } of graph.adj[u]) {
      state.stats.edgeScans++;
      if (!Win.has(v)) continue;
      if (state.pred[v] === u && state.dist[v] === state.dist[u] + weight) {
        if (!children.has(u)) children.set(u, []);
        children.get(u)!.push(v);
        hasParentInF.add(v);
      }
    }
  }

  const P: number[] = [];
  for (const u of S) {
    if (!Win.has(u) || hasParentInF.has(u)) continue;
    if (subtreeSize(u, children) >= k) P.push(u);
  }
  return { P, W };
}

function subtreeSize(root: number, children: Map<number, number[]>): number {
  let size = 0;
  const stack = [root];
  const seen = new Set<number>();
  while (stack.length) {
    const u = stack.pop()!;
    if (seen.has(u)) continue;
    seen.add(u);
    size++;
    for (const v of children.get(u) ?? []) stack.push(v);
  }
  return size;
}

// ---------------------------------------------------------------------------
// Algorithm 2 — BaseCase
// ---------------------------------------------------------------------------

function baseCase(
  graph: Graph,
  state: PathState,
  B: Val,
  S: number[],
  k: number,
): { Bprime: Val; U: number[] } {
  if (S.length !== 1) throw new Error("BaseCase requires |S| = 1");
  const x = S[0];
  const U0 = new Set<number>([x]);
  const heap = new MinHeap();
  heap.insert(x, valOf(state, x));

  while (heap.size > 0 && U0.size < k + 1) {
    const extracted = heap.extractMin();
    if (!extracted) break;
    const u = extracted.key;
    U0.add(u);
    state.stats.expansions++;
    for (const { to: v, weight } of graph.adj[u]) {
      state.stats.edgeScans++;
      // Algorithm 2 line 8 (Remark 3.4: ≤) with the "< B" test under the total order.
      if (betterOrEqual(state, u, v, weight) && cmpVal(candidateVal(state, u, v, weight), B) < 0) {
        relaxIfBetter(state, u, v, weight);
        if (!heap.has(v)) heap.insert(v, valOf(state, v));
        else heap.decreaseKey(v, valOf(state, v));
      }
    }
  }

  if (U0.size <= k) {
    return { Bprime: B, U: [...U0] };
  }
  // B′ ← max value in U0; U ← vertices strictly below B′ (unique max under total order).
  let Bprime = valOf(state, x);
  for (const v of U0) {
    const val = valOf(state, v);
    if (cmpVal(val, Bprime) > 0) Bprime = val;
  }
  const U = [...U0].filter((v) => cmpVal(valOf(state, v), Bprime) < 0);
  return { Bprime, U };
}

// ---------------------------------------------------------------------------
// Algorithm 3 — BMSSP
// ---------------------------------------------------------------------------

function bmssp(
  graph: Graph,
  state: PathState,
  l: number,
  B: Val,
  S: number[],
  k: number,
  t: number,
): { Bprime: Val; U: number[] } {
  state.stats.recursionCalls++;
  if (l === 0) return baseCase(graph, state, B, S, k);

  const { P, W } = findPivots(graph, state, B, S, k);
  const M = pow2((l - 1) * t);
  const D = new PartialSortingDS(M, B);
  for (const x of P) D.insert(x, valOf(state, x));

  // B0′ ← min pivot value (or B if P is empty, per the Algorithm 3 note).
  let lastBPrime: Val = B;
  const Uset = new Set<number>();
  const threshold = k * pow2(l * t);

  while (Uset.size < threshold && !D.isEmpty()) {
    const { bound: Bi, keys: Si } = D.pull();
    state.stats.pulls++;
    if (Si.length === 0) break;

    const { Bprime: BiPrime, U: Ui } = bmssp(graph, state, l - 1, Bi, Si, k, t);
    lastBPrime = BiPrime;
    for (const u of Ui) Uset.add(u);

    const K: KV[] = [];
    for (const u of Ui) {
      state.stats.expansions++;
      for (const { to: v, weight } of graph.adj[u]) {
        state.stats.edgeScans++;
        // Algorithm 3 lines 15–20 (Remark 3.4: ≤ under the total order).
        if (betterOrEqual(state, u, v, weight)) {
          const improved = relaxIfBetter(state, u, v, weight);
          const val = candidateVal(state, u, v, weight);
          // Only in-range values (< B) are kept; values ≥ B are handled by an
          // ancestor call that relaxes this same edge with a larger bound.
          if (cmpVal(val, B) < 0) {
            if (cmpVal(val, Bi) >= 0) {
              // Line 18: within [Bi, B) → insert into D.
              D.insert(v, val);
            } else if (improved || cmpVal(val, BiPrime) >= 0) {
              // Lines 19–20: [Bi′, Bi) vai para K, como no artigo. Alargamento
              // (decisão #3 do IMPLEMENTATION.md) restrito a vértices que
              // ACABARAM de melhorar: ainda não foram expandidos e não podem ser
              // descartados. Na versão original, qualquer valor < Bi — inclusive
              // de vértices já completos cujo caminho não mudou (caso "≤") — era
              // reinserido, reprocessando os mesmos vértices em cascata a cada
              // nível (~470 expansões por vértice num grafo de 3,5 mil vértices).
              K.push({ key: v, value: val });
            }
          }
        }
      }
    }

    const batch: KV[] = [...K];
    for (const x of Si) {
      const vx = valOf(state, x);
      if (cmpVal(vx, BiPrime) >= 0 && cmpVal(vx, Bi) < 0) batch.push({ key: x, value: vx });
    }
    if (batch.length > 0) D.batchPrepend(batch);
  }

  // Algorithm 3 line 22: B′ ← min{last Bi′, B}; U ← ⋃Ui ∪ {x∈W : d̂[x] < B′}.
  const Bprime = cmpVal(lastBPrime, B) < 0 ? lastBPrime : B;
  for (const x of W) {
    if (cmpVal(valOf(state, x), Bprime) < 0) Uset.add(x);
  }
  return { Bprime, U: [...Uset] };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function buildGraph(n: number, edges: Array<[number, number, number]>): Graph {
  const adj: Edge[][] = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) {
    if (w < 0) throw new Error("edge weights must be non-negative");
    if (u < 0 || v < 0 || u >= n || v >= n) throw new Error("edge endpoint out of range");
    adj[u].push({ to: v, weight: w });
  }
  return { n, adj };
}

export type SSSPResultWithStats = SSSPResult & { stats: DuanStats };

/** Execução sobre um grafo já em lista de adjacência (pesos ≥ 0). */
export function ssspOnGraph(original: Graph, source: number): SSSPResultWithStats {
  const n = original.n;
  const stats: DuanStats = {
    expansions: 0,
    edgeScans: 0,
    relaxations: 0,
    transformedVertices: 0,
    transformedArcs: 0,
    recursionCalls: 0,
    pulls: 0,
  };
  if (n <= 0) return { distances: [], predecessors: [], stats };
  if (source < 0 || source >= n) throw new Error("invalid source");

  const transformed = toConstantDegree(original, source);
  const g = transformed.graph;
  stats.transformedVertices = g.n;
  stats.transformedArcs = g.adj.reduce((s, a) => s + a.length, 0);
  const { k, t } = computeParams(g.n);

  const state: PathState = {
    dist: Array(g.n).fill(Infinity),
    pred: Array(g.n).fill(null),
    hops: Array(g.n).fill(0),
    stats,
  };
  state.dist[transformed.sourcePort] = 0;

  const l = Math.ceil(Math.log2(Math.max(g.n, 2)) / t);
  bmssp(g, state, l, INF_VAL, [transformed.sourcePort], k, t);

  // Distances of an original vertex = min over its ports (ports are 0-connected).
  const distances = Array(n).fill(Infinity);
  for (let v = 0; v < n; v++) {
    let best = Infinity;
    for (const p of transformed.portsOf[v]) best = Math.min(best, state.dist[p]);
    distances[v] = best;
  }

  // Árvore de predecessores no grafo ORIGINAL: BFS a partir da origem só pelos
  // arcos "justos" (dist[u] + w = dist[v]). Todo caminho mínimo usa apenas
  // arcos justos, então a BFS alcança todos os vértices; por ser BFS, não forma
  // ciclos mesmo com pesos 0. O(V + E) — a versão original fazia O(V·E).
  const predecessors: (number | null)[] = Array(n).fill(null);
  const seen = new Uint8Array(n);
  const queue = [source];
  seen[source] = 1;
  for (let h = 0; h < queue.length; h++) {
    const u = queue[h];
    for (const { to: v, weight } of original.adj[u]) {
      if (!seen[v] && distances[u] + weight === distances[v]) {
        seen[v] = 1;
        predecessors[v] = u;
        queue.push(v);
      }
    }
  }

  return { distances, predecessors, stats };
}

/**
 * Single-source shortest paths on a directed graph with non-negative real weights.
 *
 * @param n       number of vertices (ids `0 .. n-1`)
 * @param edges   directed edges `[u, v, weight]` (weight ≥ 0)
 * @param source  source vertex id
 * @returns       distances and a predecessor tree on the ORIGINAL graph.
 *                Unreachable vertices get `Infinity` / `null`.
 */
export function sssp(n: number, edges: Array<[number, number, number]>, source: number): SSSPResult {
  const { distances, predecessors } = ssspOnGraph(buildGraph(n, edges), source);
  return { distances, predecessors };
}

/** Convenience wrapper returning only the distance array. */
export function distances(
  n: number,
  edges: Array<[number, number, number]>,
  source: number,
): number[] {
  return sssp(n, edges, source).distances;
}

/** Internals exposed for focused tests / debugging. */
export const __internal = {
  computeParams,
  toConstantDegree,
  findPivots,
  baseCase,
  bmssp,
  PartialSortingDS,
  buildGraph,
  INF_VAL,
  valOf,
  cmpVal,
};
