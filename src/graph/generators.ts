import type { Graph } from "../algorithms/types";

/** Peso inteiro aleatório em [1, 10] (melhor para rótulos no editor). */
function randWeight(): number {
  return Math.floor(Math.random() * 10) + 1;
}

/** Grafo esparso (E ≈ V) */
export function generateSparseGraph(n: number): Graph {
  const g: Graph = Array.from({ length: n }, () => []);

  for (let i = 0; i < n; i++) {
    const to = Math.floor(Math.random() * n);
    g[i].push({ to, weight: randWeight() });
  }

  return g;
}

/** Grafo denso (E ≈ V²) */
export function generateDenseGraph(n: number): Graph {
  const g: Graph = Array.from({ length: n }, () => []);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        g[i].push({
          to: j,
          weight: randWeight(),
        });
      }
    }
  }

  return g;
}

/** Grafo linear (lista) */
export function generateLinearGraph(n: number): Graph {
  const g: Graph = Array.from({ length: n }, () => []);

  for (let i = 0; i < n - 1; i++) {
    g[i].push({
      to: i + 1,
      weight: randWeight(),
    });
  }

  return g;
}

/**
 * Grafo em grade (tipo mapa): vizinhos ortogonais, mesmo peso nos dois sentidos.
 * Cada ligação recebe um peso inteiro aleatório (como os outros modelos).
 */
export function generateGridGraph(rows: number, cols: number): Graph {
  const n = rows * cols;
  const g: Graph = Array.from({ length: n }, () => []);

  const id = (r: number, c: number) => r * cols + c;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = id(r, c);

      if (r + 1 < rows) {
        const v = id(r + 1, c);
        const w = randWeight();
        g[u].push({ to: v, weight: w });
        g[v].push({ to: u, weight: w });
      }
      if (c + 1 < cols) {
        const v = id(r, c + 1);
        const w = randWeight();
        g[u].push({ to: v, weight: w });
        g[v].push({ to: u, weight: w });
      }
    }
  }

  return g;
}

/** Com pesos negativos (pode criar instâncias problemáticas; uso típico: Bellman-Ford) */
export function generateNegativeWeights(n: number): Graph {
  const g = generateSparseGraph(n);

  for (let i = 0; i < n; i++) {
    for (const edge of g[i]) {
      if (Math.random() < 0.3) {
        edge.weight *= -1;
      }
    }
  }

  return g;
}

/** Adiciona um ciclo negativo explícito entre os vértices 0 → 1 → 2 → 0 */
export function addNegativeCycle(g: Graph): Graph {
  if (g.length < 3) return g;

  g[0].push({ to: 1, weight: 1 });
  g[1].push({ to: 2, weight: 1 });
  g[2].push({ to: 0, weight: -5 });

  return g;
}

/** Componente desconexo (parte dos vérticos sem arestas de saída) */
export function generateDisconnected(n: number): Graph {
  const g = generateSparseGraph(n);

  const cut = Math.floor(n / 2);

  for (let i = cut; i < n; i++) {
    g[i] = [];
  }

  return g;
}
