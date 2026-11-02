import { createRng } from "../../utils/random";

export type ForceLayoutOptions = {
  /** Comprimento ideal de aresta (px). */
  idealLength?: number;
  iterations?: number;
  seed?: number;
  /** Posições iniciais (x, y intercalados), ex.: para refinar um layout existente. */
  initial?: Float64Array;
};

/**
 * Layout por forças (Fruchterman-Reingold): arestas atraem, vértices se
 * repelem, e o "resfriamento" reduz o passo a cada iteração. A repulsão usa
 * uma grade espacial com raio de corte (só vizinhos próximos), O(V + E) por
 * iteração em vez de O(V²); uma leve gravidade mantém componentes desconexas
 * próximas. Pares (u, v) repetidos ou nos dois sentidos contam uma vez.
 */
export function forceLayout(n: number, pairs: Array<[number, number]>, opts: ForceLayoutOptions = {}): Float64Array {
  const L = opts.idealLength ?? 130;
  const iterations = opts.iterations ?? (n <= 150 ? 400 : n <= 1000 ? 250 : 150);
  const rng = createRng(opts.seed ?? 7);
  const side = L * Math.sqrt(Math.max(n, 1)) * 1.2;
  const pos = new Float64Array(2 * n);
  if (opts.initial && opts.initial.length === 2 * n) pos.set(opts.initial);
  else for (let i = 0; i < 2 * n; i++) pos[i] = rng() * side;
  if (n <= 1) return pos;

  const seen = new Set<number>();
  const edges: number[] = [];
  for (const [u, v] of pairs) {
    if (u === v) continue;
    const key = Math.min(u, v) * n + Math.max(u, v);
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push(u, v);
  }

  const disp = new Float64Array(2 * n);
  const cutoff = 2.5 * L;
  const k2 = L * L;
  let temperature = side / 8;
  const cool = temperature / (iterations + 1);
  const cellOf = new Int32Array(n);
  const head = new Map<number, number>();
  const next = new Int32Array(n);

  for (let it = 0; it < iterations; it++) {
    disp.fill(0);

    // Repulsão (k²/d) entre vértices em células vizinhas da grade.
    head.clear();
    for (let i = 0; i < n; i++) {
      const cx = Math.floor(pos[2 * i] / cutoff);
      const cy = Math.floor(pos[2 * i + 1] / cutoff);
      const key = cx * 73856093 ^ cy * 19349663;
      cellOf[i] = key;
      next[i] = head.get(key) ?? -1;
      head.set(key, i);
    }
    for (let i = 0; i < n; i++) {
      const xi = pos[2 * i];
      const yi = pos[2 * i + 1];
      const cx = Math.floor(xi / cutoff);
      const cy = Math.floor(yi / cutoff);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let j = head.get((cx + dx) * 73856093 ^ (cy + dy) * 19349663) ?? -1; j !== -1; j = next[j]) {
            if (j <= i) continue;
            let ddx = xi - pos[2 * j];
            let ddy = yi - pos[2 * j + 1];
            let d2 = ddx * ddx + ddy * ddy;
            if (d2 < 0.01) {
              ddx = rng() - 0.5;
              ddy = rng() - 0.5;
              d2 = 0.01;
            }
            if (d2 > cutoff * cutoff) continue;
            const f = k2 / d2; // (k²/d) / d — já normalizado pela direção
            disp[2 * i] += ddx * f;
            disp[2 * i + 1] += ddy * f;
            disp[2 * j] -= ddx * f;
            disp[2 * j + 1] -= ddy * f;
          }
        }
      }
    }

    // Atração (d²/k) ao longo das arestas.
    for (let e = 0; e < edges.length; e += 2) {
      const u = edges[e];
      const v = edges[e + 1];
      const ddx = pos[2 * u] - pos[2 * v];
      const ddy = pos[2 * u + 1] - pos[2 * v + 1];
      const d = Math.sqrt(ddx * ddx + ddy * ddy) || 0.01;
      const f = d / L; // (d²/k) / d
      disp[2 * u] -= ddx * f;
      disp[2 * u + 1] -= ddy * f;
      disp[2 * v] += ddx * f;
      disp[2 * v + 1] += ddy * f;
    }

    // Gravidade fraca em direção ao centro.
    let mx = 0;
    let my = 0;
    for (let i = 0; i < n; i++) {
      mx += pos[2 * i];
      my += pos[2 * i + 1];
    }
    mx /= n;
    my /= n;
    for (let i = 0; i < n; i++) {
      disp[2 * i] -= (pos[2 * i] - mx) * 0.02;
      disp[2 * i + 1] -= (pos[2 * i + 1] - my) * 0.02;
    }

    // Move limitado pela temperatura.
    for (let i = 0; i < n; i++) {
      const dx = disp[2 * i];
      const dy = disp[2 * i + 1];
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const step = Math.min(len, temperature);
        pos[2 * i] += (dx / len) * step;
        pos[2 * i + 1] += (dy / len) * step;
      }
    }
    temperature = Math.max(temperature - cool, 0.5);
  }
  return normalizePositions(pos);
}

/** Translada para que o menor x/y fique em 0. */
export function normalizePositions(pos: Float64Array): Float64Array {
  let minX = Infinity;
  let minY = Infinity;
  for (let i = 0; i < pos.length; i += 2) {
    if (pos[i] < minX) minX = pos[i];
    if (pos[i + 1] < minY) minY = pos[i + 1];
  }
  for (let i = 0; i < pos.length; i += 2) {
    pos[i] -= minX;
    pos[i + 1] -= minY;
  }
  return pos;
}
