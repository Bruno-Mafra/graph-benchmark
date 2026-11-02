/**
 * Limites do labirinto. Ajuste aqui para mudar o que é editável / gerável.
 */
export const MAZE_LIMITS = {
  /** Menor N aceito em qualquer modo. */
  minSize: 5,
  /** Maior N aceito (apenas geração aleatória acima de `largeGridThreshold`). */
  maxSize: 1000,
  /**
   * A partir deste N o grid é considerado "grande": não é possível criar
   * manualmente nem editar célula por célula.
   */
  largeGridThreshold: 80,
  /** Faixa padrão sugerida para o N aleatório. */
  defaultRandomMin: 21,
  defaultRandomMax: 151,
  /** Tamanho padrão do grid vazio criado manualmente. */
  defaultManualSize: 25,
} as const;

export function clampMazeSize(n: number, max: number = MAZE_LIMITS.maxSize): number {
  if (!Number.isFinite(n)) return MAZE_LIMITS.minSize;
  return Math.min(max, Math.max(MAZE_LIMITS.minSize, Math.round(n)));
}

export function isLargeGrid(size: number): boolean {
  return size > MAZE_LIMITS.largeGridThreshold;
}
