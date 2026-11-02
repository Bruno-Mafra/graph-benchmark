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

type PathState = {
  dist: number[];
  pred: (number | null)[];
  hops: number[];
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

/** Commit d̂[v]/Pred[v]/hops[v] only when the candidate path is strictly better. */
function relaxIfBetter(state: PathState, u: number, v: number, weight: number): void {
  if (comparePath(state, u, v, weight) < 0) {
    state.dist[v] = state.dist[u] + weight;
    state.pred[v] = u;
    state.hops[v] = state.hops[u] + 1;
  }
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
 * Decision: block splitting uses a comparison sort (O(M log M)) rather than the
 * linear-time median selection of [BFP+73]. This preserves correctness and the
 * block-size invariants; only the constant factor differs.
 */
class PartialSortingDS {
  private readonly M: number;
  private readonly B: Val;
  private readonly D0: Block[] = [];
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

  private removeKeyFromBlocks(key: number): void {
    const scrub = (blocks: Block[]) => {
      for (const block of blocks) {
        const idx = block.items.findIndex((p) => p.key === key);
        if (idx >= 0) {
          block.items.splice(idx, 1);
          return true;
        }
      }
      return false;
    };
    if (!scrub(this.D0)) scrub(this.D1);
  }

  private deleteKey(key: number): void {
    if (!this.keyValue.has(key)) return;
    this.keyValue.delete(key);
    this.removeKeyFromBlocks(key);
  }

  insert(key: number, value: Val): void {
    const existing = this.keyValue.get(key);
    if (existing !== undefined) {
      if (cmpVal(value, existing) >= 0) return;
      this.deleteKey(key);
    }
    this.keyValue.set(key, value);

    let blockIndex = this.D1.findIndex((b) => cmpVal(b.upperBound, value) >= 0);
    if (blockIndex < 0) blockIndex = this.D1.length - 1;
    this.D1[blockIndex].items.push({ key, value });
    if (this.D1[blockIndex].items.length > this.M) this.splitD1(blockIndex);
  }

  private splitD1(blockIndex: number): void {
    const block = this.D1[blockIndex];
    block.items.sort((a, b) => cmpVal(a.value, b.value));
    const mid = Math.ceil(block.items.length / 2);
    const leftItems = block.items.slice(0, mid);
    const rightItems = block.items.slice(mid);
    const leftUpper = rightItems.length === 0 ? block.upperBound : rightItems[0].value;
    this.D1.splice(
      blockIndex,
      1,
      { items: leftItems, upperBound: leftItems.length === 0 ? block.upperBound : leftUpper },
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
      if (existing !== undefined) {
        if (cmpVal(value, existing) >= 0) continue;
        this.deleteKey(key);
      }
      this.keyValue.set(key, value);
      fresh.push({ key, value });
    }
    if (fresh.length === 0) return;

    fresh.sort((a, b) => cmpVal(a.value, b.value));

    if (fresh.length <= this.M) {
      this.D0.unshift({ items: fresh, upperBound: fresh[fresh.length - 1].value });
      return;
    }
    const cap = Math.max(1, Math.ceil(this.M / 2));
    const newBlocks: Block[] = [];
    for (let i = 0; i < fresh.length; i += cap) {
      const chunk = fresh.slice(i, i + cap);
      newBlocks.push({ items: chunk, upperBound: chunk[chunk.length - 1].value });
    }
    this.D0.unshift(...newBlocks);
  }

  /** Up to M smallest keys plus a separator: max(S′) < bound ≤ min(remaining); B if empty. */
  pull(): { bound: Val; keys: number[] } {
    if (this.keyValue.size === 0) return { bound: this.B, keys: [] };

    const takePrefix = (blocks: Block[], limit: number): KV[] => {
      const out: KV[] = [];
      for (const block of blocks) {
        for (const item of block.items) {
          out.push(item);
          if (out.length >= limit) return out;
        }
      }
      return out;
    };

    const candidates = [...takePrefix(this.D0, this.M), ...takePrefix(this.D1, this.M)];
    candidates.sort((a, b) => cmpVal(a.value, b.value));

    const seen = new Set<number>();
    const unique: KV[] = [];
    for (const c of candidates) {
      if (seen.has(c.key)) continue;
      seen.add(c.key);
      unique.push(c);
    }

    const take = unique.slice(0, Math.min(this.M, unique.length));
    if (take.length === 0) return { bound: this.B, keys: [] };

    for (const { key } of take) this.deleteKey(key);

    if (this.keyValue.size === 0) return { bound: this.B, keys: take.map((p) => p.key) };

    let minRemaining = INF_VAL;
    let first = true;
    for (const v of this.keyValue.values()) {
      if (first || cmpVal(v, minRemaining) < 0) {
        minRemaining = v;
        first = false;
      }
    }
    return { bound: minRemaining, keys: take.map((p) => p.key) };
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
      for (const { to: v, weight } of graph.adj[u]) {
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
    for (const { to: v, weight } of graph.adj[u]) {
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
    if (Si.length === 0) break;

    const { Bprime: BiPrime, U: Ui } = bmssp(graph, state, l - 1, Bi, Si, k, t);
    lastBPrime = BiPrime;
    for (const u of Ui) Uset.add(u);

    const K: KV[] = [];
    for (const u of Ui) {
      for (const { to: v, weight } of graph.adj[u]) {
        // Algorithm 3 lines 15–20 (Remark 3.4: ≤ under the total order).
        if (betterOrEqual(state, u, v, weight)) {
          relaxIfBetter(state, u, v, weight);
          const val = candidateVal(state, u, v, weight);
          // Only in-range values (< B) are kept; values ≥ B are handled by an
          // ancestor call that relaxes this same edge with a larger bound.
          if (cmpVal(val, B) < 0) {
            if (cmpVal(val, Bi) >= 0) {
              // Line 18: within [Bi, B) → insert into D.
              D.insert(v, val);
            } else {
              // Lines 19–20 (widened): any newly-improved value < Bi is carried
              // back via K. The paper only names the sub-interval [Bi′, Bi), but a
              // vertex first discovered here with value < Bi′ is NOT yet expanded,
              // so it must be re-processed rather than dropped.
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

/**
 * Single-source shortest paths on a directed graph with non-negative real weights.
 *
 * @param n       number of vertices (ids `0 .. n-1`)
 * @param edges   directed edges `[u, v, weight]` (weight ≥ 0)
 * @param source  source vertex id
 * @returns       distances and a predecessor tree on the ORIGINAL graph.
 *                Unreachable vertices get `Infinity` / `null`.
 */
export function sssp(
  n: number,
  edges: Array<[number, number, number]>,
  source: number,
): SSSPResult {
  if (n <= 0) return { distances: [], predecessors: [] };
  if (source < 0 || source >= n) throw new Error("invalid source");

  const original = buildGraph(n, edges);
  const transformed = toConstantDegree(original, source);
  const g = transformed.graph;
  const { k, t } = computeParams(g.n);

  const state: PathState = {
    dist: Array(g.n).fill(Infinity),
    pred: Array(g.n).fill(null),
    hops: Array(g.n).fill(0),
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

  // Original-graph predecessor tree recovered from the settled distances.
  const predecessors: (number | null)[] = Array(n).fill(null);
  for (let v = 0; v < n; v++) {
    if (v === source || !Number.isFinite(distances[v])) continue;
    for (let u = 0; u < n; u++) {
      if (!Number.isFinite(distances[u])) continue;
      for (const { to, weight } of original.adj[u]) {
        if (to === v && distances[u] + weight === distances[v]) {
          predecessors[v] = u;
          break;
        }
      }
      if (predecessors[v] !== null) break;
    }
  }

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
