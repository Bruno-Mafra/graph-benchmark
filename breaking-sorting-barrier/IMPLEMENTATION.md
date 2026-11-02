# Implementation notes — Breaking the Sorting Barrier for Directed SSSP

Implementation of the deterministic single-source shortest path (SSSP) algorithm from

> Ran Duan, Jiayi Mao, Xiao Mao, Xinkai Shu, Longhui Yin.
> *Breaking the Sorting Barrier for Directed Single-Source Shortest Paths* (2025).

The code lives in [`algorithm.ts`](./algorithm.ts). This document explains the
algorithm, how the code maps to the paper, the decisions taken where the paper
leaves details open, the edge cases considered, and how it was validated.

---

## 1. What the paper describes

The paper gives a **deterministic** `O(m · log^{2/3} n)`-time algorithm for SSSP
on **directed** graphs with **non-negative real** edge weights in the
comparison–addition model. It is the first algorithm to beat Dijkstra's
`O(m + n log n)` bound on sparse graphs — i.e. it "breaks the sorting barrier".

The core idea merges Dijkstra (pick closest, relax) with Bellman-Ford (relax all
edges for a few rounds) through a **recursive partitioning** that keeps the
Dijkstra "frontier" small. It has three routines plus a specialised data
structure:

- **Algorithm 1 — `FindPivots(B, S)`**: runs `k` Bellman-Ford-style relaxation
  rounds from the frontier `S`, then shrinks `S` to a small set of **pivots** `P`
  (roots of shortest-path subtrees of size `≥ k`), returning `P` and the touched
  set `W`. This is the "frontier reduction" that makes the whole thing work:
  `|P| ≤ |W|/k`.
- **Algorithm 2 — `BaseCase(B, S)`**: when the recursion bottoms out (`l = 0`,
  `S = {x}` a single complete vertex), a bounded mini-Dijkstra explores up to
  `k + 1` closest vertices below the bound `B`.
- **Algorithm 3 — `BMSSP(l, B, S)`**: the recursive *Bounded Multi-Source
  Shortest Path* routine. It calls `FindPivots`, then repeatedly `Pull`s the
  smallest-value batch of pivots from the data structure, recurses on level
  `l - 1`, relaxes the returned complete vertices, and re-inserts newly
  discovered vertices — either into `D` (within `[Bi, B)`) or carried back via a
  batch-prepend set `K` (below `Bi`).
- **Lemma 3.3 data structure**: a block-based structure supporting `Insert`,
  `BatchPrepend` and `Pull` (return the `≤ M` smallest key/value pairs plus a
  separating bound) in the amortised times the analysis needs.

Top-level call: `BMSSP(⌈log n / t⌉, ∞, {s})` with `k = ⌊log^{1/3} n⌋`,
`t = ⌊log^{2/3} n⌋`.

A prerequisite (§2) is the **constant-degree transformation**: every vertex is
replaced by a zero-weight cycle of "ports" (one per neighbour) so in/out-degree
is `≤ 2`, giving `O(m)` vertices and edges while preserving distances.

---

## 2. Code ↔ paper mapping

| Paper | Code (`algorithm.ts`) |
|---|---|
| Constant-degree transform (§2) | `toConstantDegree` |
| Total order over paths (Assumption 2.1) | `Val`, `cmpVal`, `comparePath`, `betterOrEqual` |
| `d̂`, `Pred`, relaxation | `PathState`, `relaxIfBetter` |
| Lemma 3.3 structure | `class PartialSortingDS` (`insert`, `batchPrepend`, `pull`) |
| Binary heap (`[Wil64]`) | `class MinHeap` |
| Algorithm 1 `FindPivots` | `findPivots` |
| Algorithm 2 `BaseCase` | `baseCase` |
| Algorithm 3 `BMSSP` | `bmssp` |
| Top-level driver + result mapping | `sssp` (public), `distances` |

`k`, `t` and the top level `l` are computed in `computeParams` / `sssp`.

---

## 3. The key correctness ingredient: the total order

The paper makes **Assumption 2.1**: *all paths have distinct lengths*. It then
orders paths lexicographically by the tuple

```
⟨ length , #hops , reversed vertex sequence ⟩.
```

This is not just cosmetic — the whole boundary/interval machinery (`B`, `Bi`,
`B'`, the sets `U = {v : d(v) < B'}`) only makes sense if the order is a **strict
total order**. It matters doubly here because the constant-degree transformation
introduces **zero-weight cycles**, so many vertices share the same *numeric*
distance. If bounds and intervals were compared purely numerically, the boundary
`B' = max(...)` would exclude *all* tied vertices at once and the recursion would
either stall or loop forever around a zero-weight cycle.

We therefore represent the "value" of the current best path to a vertex as

```ts
type Val = { d: number; h: number; v: number }; // ⟨dist, hops, endpoint⟩
```

and use `cmpVal` **everywhere a comparison against a bound happens**: relaxation,
the `[Bi, B)` / `< Bi` interval tests, the boundaries `B` / `Bi` / `B'`, the
ordering inside `PartialSortingDS`, and the `MinHeap`. Two paths ending at the
same `v` first differ at the predecessor, so comparing `⟨dist, hops, pred⟩` is an
`O(1)` faithful realisation of the paper's tuple order (§2, "Total order of
Paths"). `INF_VAL` is a sentinel greater than every real value, used for `B = ∞`.

Going around a zero-weight cycle keeps `d` constant but strictly increases `h`,
so under this order it is *strictly worse* and is never taken — which is exactly
what guarantees termination.

---

## 4. Decisions where the paper leaves details open

These are the points where a faithful implementation still has to choose
something; each is flagged in the code.

1. **Logarithm base for `k`, `t`.** Base-2, the standard convention in this line
   of work. Both are clamped to `≥ 1` so tiny inputs stay well-defined
   (`computeParams`).

2. **Enqueue rule = "≤" under the total order (Remark 3.4), not strict.**
   Algorithm 1/2/3 all relax with the condition `d̂[u] + w_uv ≤ d̂[v]`. The
   equality is required (Remark 3.4) so that an edge already relaxed on a lower
   level can be *re-used* on an upper level; concretely, a vertex whose distance
   was set by a `FindPivots` round must still be re-expanded by the recursive
   calls. We implement `≤` via `comparePath(...) ≤ 0`, where equality means
   "same path" (`u == Pred[v]`). This never triggers on a zero-weight
   back-edge (those are strictly worse), so it does not loop.

3. **The `K` carry-back interval is *widened* from `[Bi', Bi)` to "everything
   `< Bi`".** *This is the one substantive deviation and it is deliberate.*
   Algorithm 3 (lines 17–20) only names two buckets for a newly relaxed neighbour
   `v`: insert into `D` if `d̂[u]+w ∈ [Bi, B)`, else record in `K` if
   `∈ [Bi', Bi)`. Values `< Bi'` are implicitly dropped, on the grounds that such
   a vertex is *already complete*. That reasoning holds for the paper's invariant
   but is fragile to reproduce exactly with the bounded base case: we found
   concrete graphs where a vertex is first discovered here with value `< Bi'` yet
   has **not** been expanded, and dropping it left its out-edges (notably the
   final hop of a zero-weight port chain) permanently un-relaxed — a reachable
   vertex ended up `∞`. Widening the lower bucket to *any* improving value `< Bi`
   (still `< B`) guarantees every newly improved vertex is scheduled for
   expansion. Combined with the strict-improvement semantics of `relaxIfBetter`
   and the `≤` de-duplication in `PartialSortingDS`, this keeps the algorithm
   both **correct** and **terminating**. Values `≥ B` are still left to an
   ancestor call (which relaxes the same edge with a larger bound), exactly as in
   the paper.

4. **`PartialSortingDS` block split uses a comparison sort** (`O(M log M)`)
   rather than the linear-time median selection of `[BFP+73]`. This preserves the
   block-size invariants and correctness; only the constant factor differs. The
   structure keeps the paper's two block sequences `D0` (batch-prepended) and
   `D1` (inserted) and the per-block upper bounds.

5. **Forest `F` in `FindPivots`** (line 15) is built from the current
   shortest-path-tree edges (`Pred[v] == u ∧ d̂[v] == d̂[u]+w_uv`); pivots are the
   `S`-roots whose subtree has `≥ k` vertices. Using `Pred` makes `F` an actual
   forest under the total order, matching "F is a directed forest under
   Assumption 2.1".

6. **Complexity vs. correctness.** The implementation follows the *structure* of
   the algorithm faithfully, but the data structures use straightforward
   `O(...)` building blocks (arrays, a binary heap, comparison sorts) rather than
   the finely-tuned amortised structures the `O(m log^{2/3} n)` bound requires.
   The goal here is a faithful, *correct* realisation of the algorithm's logic,
   not to reproduce the exact asymptotic constant. The asymptotic *shape*
   (recursion depth `O(log n / t)`, frontier reduction by `1/k`, pivot bound
   `|P| ≤ |U|/k`) is preserved.

7. **Predecessor reconstruction** is done on the *original* graph after the run,
   by picking, for each reachable `v`, any in-neighbour `u` with
   `dist[u] + w = dist[v]`. This avoids threading the gadget-port predecessor
   chain back through zero-weight cycles and yields a valid shortest-path tree.

---

## 5. Edge cases and invariants exercised

- **Zero-weight edges / cycles** — created abundantly by the constant-degree
  transform and also injected directly in tests. These are the main stressor of
  the total order (Assumption 2.1) and the reason for decision #2/#3.
- **Ties (equal-length distinct paths)** — resolved by `⟨dist, hops, endpoint⟩`.
- **Unreachable vertices** — returned as `Infinity` / `null`. (The paper assumes
  full reachability; we simply compute distances for the reachable component.)
- **Single vertex / no edges**, **disconnected graphs**, **self-loops**,
  **parallel edges**.
- **Bound monotonicity** (Lemma 3.10) and the successful-vs-partial execution
  distinction (Lemma 3.1) are respected by the `while |U| < k·2^{lt}` loop and
  the `B' = min{last Bi', B}` return.

---

## 6. Validation

Two harnesses accompany the implementation (run with a TypeScript runner such as
`npx tsx`, or `node` after compiling):

- [`validate.ts`](./validate.ts) — a curated suite (line, diamond, zero-weight,
  disconnected, equal-length paths, sparse, several random graphs, a direct check
  that the constant-degree transform yields in/out-degree `≤ 2`, and a
  predecessor-tree check). Each result is compared against a reference Dijkstra.
- [`stress.ts`](./stress.ts) — randomised differential testing against Dijkstra
  over many graphs with mixed zero/positive weights, varying size, density and
  source.

**Status: all checks pass.**

```
$ npx tsx breaking-sorting-barrier/validate.ts
OK  single vertex
OK  line
OK  diamond
OK  zero weights
OK  disconnected
OK  equal path lengths
OK  sparse n=40
OK  random n=25 seed=1 … n=200 seed=100
OK  zero-heavy n=80
OK  constant-degree transform degrees
OK  after transform distances
OK  pred distances / predecessor tree
All validation checks passed.

$ npx tsx breaking-sorting-barrier/stress.ts
checked=3000 failures=0
STRESS PASSED
```

The `3000`-graph differential run (graphs up to ~80 vertices, ~30% zero-weight
edges, random sources) reported **zero** mismatches against Dijkstra and always
terminated, giving good confidence in correctness.

### Environment note
The workspace runs Node v16, which is below `tsx`/`esbuild`'s supported engine.
The `EBADENGINE` warnings are harmless; execution succeeds. The `sssp`/`distances`
functions themselves are plain TypeScript with no runtime dependencies.

---

## 7. What is *not* claimed

- **The theoretical `O(m log^{2/3} n)` running time is not reproduced.** The
  data structures are simple (see decision #6), so the constant factors and some
  amortised bounds differ. The algorithm's *logic and structure* are faithful;
  its raw speed is not tuned and, on these small inputs, is not competitive with
  a plain Dijkstra.
- **One intentional deviation** from the literal pseudocode exists: the widened
  `K` interval (decision #3). It is required for correctness in the presence of
  the bounded base case and zero-weight chains, and is documented at its call
  site. Everything else follows Algorithms 1–3 and Lemma 3.3 as written, under
  the total order of §2.
- No properties beyond "matches Dijkstra's distances on the tested inputs" are
  asserted; correctness is established empirically via differential testing, not
  by a machine-checked proof.
