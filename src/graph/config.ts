/**
 * Limites de visualização do editor de grafos. Acima deles, o grafo é exibido
 * em Canvas (somente leitura): o React Flow cria um elemento DOM por nó/aresta
 * e fica lento. A execução dos algoritmos não depende da visualização.
 */
export const GRAPH_VIEW_LIMITS = {
  editorMaxNodes: 300,
  editorMaxEdges: 900,
  /** Acima disso os rótulos de peso ficam ocultos por padrão (poluem a tela). */
  labelMaxEdges: 250,
  /** Maior grafo gerado por modelo pronto. */
  presetMaxNodes: 5000,
} as const;

export function needsCanvasView(nodes: number, edges: number): boolean {
  return nodes > GRAPH_VIEW_LIMITS.editorMaxNodes || edges > GRAPH_VIEW_LIMITS.editorMaxEdges;
}
