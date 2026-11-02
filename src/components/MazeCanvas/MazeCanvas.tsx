import React, { useEffect, useMemo, useRef, useState } from "react";
import type { MazeGrid } from "../../maze/model";
import type { MazeSolveResult } from "../../maze/algorithms/types";
import { MAZE_COLORS, Viewport, CanvasHolder, StyledCanvas } from "./styles";

/** Lado máximo do canvas em pixels reais (evita alocar texturas gigantes). */
const MAX_BACKING_PX = 4096;
/** Lado do labirinto no zoom 1× (ajustado à largura disponível). */
const MAX_FIT_PX = 744;

export type MazeCanvasProps = {
  grid: MazeGrid;
  /** Resultado a desenhar (caminho + exploradas). */
  result: MazeSolveResult | null;
  showExplored: boolean;
  /** 1 = ajustar à largura; >1 amplia e permite rolar. */
  zoom: number;
  editable: boolean;
  /** `first` = início do gesto (clique); depois, células arrastadas. */
  onCellPaint?: (index: number, first: boolean) => void;
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const RGB = {
  empty: hexToRgb(MAZE_COLORS.empty),
  wall: hexToRgb(MAZE_COLORS.wall),
  explored: hexToRgb(MAZE_COLORS.explored),
  path: hexToRgb(MAZE_COLORS.path),
};

/** Imagem 1 px por célula; escalada depois sem suavização. */
function renderCellsImage(
  grid: MazeGrid,
  result: MazeSolveResult | null,
  showExplored: boolean
): HTMLCanvasElement {
  const { size, walls } = grid;
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const ctx = off.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const data = img.data;
  const explored = showExplored ? result?.explored : undefined;

  for (let i = 0; i < walls.length; i++) {
    const color = walls[i] ? RGB.wall : explored && explored[i] ? RGB.explored : RGB.empty;
    const p = i * 4;
    data[p] = color[0];
    data[p + 1] = color[1];
    data[p + 2] = color[2];
    data[p + 3] = 255;
  }
  if (result) {
    for (const i of result.path) {
      const p = i * 4;
      data[p] = RGB.path[0];
      data[p + 1] = RGB.path[1];
      data[p + 2] = RGB.path[2];
    }
  }
  ctx.putImageData(img, 0, 0);
  return off;
}

function MazeCanvas({ grid, result, showExplored, zoom, editable, onCellPaint }: MazeCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const dragRef = useRef<{ last: number } | null>(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportWidth(el.clientWidth));
    ro.observe(el);
    setViewportWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const size = grid.size;
  const fitPx = Math.max(120, Math.min(viewportWidth - 16, MAX_FIT_PX));
  const displayPx = fitPx * zoom;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const backingCell = Math.max(
    1,
    Math.min(Math.floor((displayPx * dpr) / size), Math.floor(MAX_BACKING_PX / size))
  );
  const backingPx = backingCell * size;

  const cellsImage = useMemo(
    () => renderCellsImage(grid, result, showExplored),
    [grid, result, showExplored]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewportWidth === 0) return;
    canvas.width = backingPx;
    canvas.height = backingPx;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cellsImage, 0, 0, backingPx, backingPx);

    // Linhas de grade só quando as células são grandes o bastante.
    if (backingCell >= 8) {
      ctx.strokeStyle = MAZE_COLORS.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 1; k < size; k++) {
        const p = k * backingCell + 0.5;
        ctx.moveTo(p, 0);
        ctx.lineTo(p, backingPx);
        ctx.moveTo(0, p);
        ctx.lineTo(backingPx, p);
      }
      ctx.stroke();
    }

    const center = (i: number): [number, number] => [
      ((i % size) + 0.5) * backingCell,
      (Math.floor(i / size) + 0.5) * backingCell,
    ];

    // Em células muito pequenas, reforça o caminho com uma linha pelos centros.
    if (result && result.path.length > 1 && backingCell < 3) {
      ctx.strokeStyle = MAZE_COLORS.path;
      ctx.lineWidth = Math.max(backingCell, 2 * dpr);
      ctx.lineJoin = "round";
      ctx.beginPath();
      result.path.forEach((i, k) => {
        const [x, y] = center(i);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Início e destino como marcadores com tamanho mínimo visível.
    const radius = Math.max(backingCell * 0.38, (5 * backingPx) / displayPx);
    const marker = (i: number | null, color: string) => {
      if (i == null) return;
      const [x, y] = center(i);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = Math.max(1, radius * 0.25);
      ctx.strokeStyle = "#0d0d0d";
      ctx.stroke();
    };
    marker(grid.start, MAZE_COLORS.start);
    marker(grid.goal, MAZE_COLORS.goal);
  }, [cellsImage, grid, result, size, backingCell, backingPx, displayPx, dpr, viewportWidth]);

  const cellAt = (e: React.PointerEvent<HTMLCanvasElement>): number | null => {
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * size);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * size);
    if (row < 0 || col < 0 || row >= size || col >= size) return null;
    return row * size + col;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editable || !onCellPaint || e.button !== 0) return;
    const idx = cellAt(e);
    if (idx == null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { last: idx };
    onCellPaint(idx, true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || !onCellPaint) return;
    const idx = cellAt(e);
    if (idx == null || idx === drag.last) return;
    // Interpola entre a última célula e a atual para não pular células em movimentos rápidos.
    const r0 = Math.floor(drag.last / size);
    const c0 = drag.last % size;
    const r1 = Math.floor(idx / size);
    const c1 = idx % size;
    const steps = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
    for (let s = 1; s <= steps; s++) {
      const r = Math.round(r0 + ((r1 - r0) * s) / steps);
      const c = Math.round(c0 + ((c1 - c0) * s) / steps);
      onCellPaint(r * size + c, false);
    }
    drag.last = idx;
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  return (
    <Viewport ref={viewportRef}>
      <CanvasHolder>
        <StyledCanvas
          ref={canvasRef}
          $editable={editable}
          style={{ width: displayPx, height: displayPx }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-label={`Labirinto ${size} × ${size}`}
          role="img"
        />
      </CanvasHolder>
    </Viewport>
  );
}

export default MazeCanvas;
