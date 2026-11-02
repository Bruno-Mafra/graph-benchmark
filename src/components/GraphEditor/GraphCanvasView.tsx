import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Node, Edge as RFEdge } from "reactflow";
import { edgeIsBidirectional, nodeLabel } from "../../graph/editorModel";
import { NODE_SIZE } from "../../graph/editorBuild";
import { ActionButton } from "../../pages/mazeStyles";
import type { GraphHighlight } from "./GraphEditor";
import { CanvasSurface, FloatingButtons, ROLE_COLORS } from "./styles";

type Props = {
  nodes: Node[];
  edges: RFEdge[];
  highlight: GraphHighlight | null;
  sourceId: string | null;
  targetId: string | null;
};

type View = { scale: number; tx: number; ty: number };

/**
 * Visualização somente leitura para grafos grandes, desenhada em Canvas (um
 * único elemento, em vez de milhares de nós no DOM). Roda do mouse = zoom no
 * cursor; arrastar = mover. Setas e rótulos aparecem quando o zoom permite.
 */
function GraphCanvasView({ nodes, edges, highlight, sourceId, targetId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View>({ scale: 1, tx: 0, ty: 0 });
  const frameRef = useRef(0);

  const model = useMemo(() => {
    const index = new Map(nodes.map((n, i) => [n.id, i]));
    const xs = new Float64Array(nodes.length);
    const ys = new Float64Array(nodes.length);
    nodes.forEach((n, i) => {
      xs[i] = n.position.x + NODE_SIZE / 2;
      ys[i] = n.position.y + NODE_SIZE / 2;
    });
    const eu: number[] = [];
    const ev: number[] = [];
    const directed: boolean[] = [];
    for (const e of edges) {
      const u = index.get(e.source);
      const v = index.get(e.target);
      if (u === undefined || v === undefined) continue;
      eu.push(u);
      ev.push(v);
      directed.push(!edgeIsBidirectional(e));
    }
    return { index, xs, ys, eu, ev, directed, labels: nodes.map(nodeLabel) };
  }, [nodes, edges]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext("2d")!;
    const { scale, tx, ty } = viewRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#141418";
    ctx.fillRect(0, 0, w, h);
    const X = (i: number) => model.xs[i] * scale + tx;
    const Y = (i: number) => model.ys[i] * scale + ty;
    const r = Math.max(2, (NODE_SIZE / 2) * scale);
    const m = model.eu.length;

    const drawEdge = (k: number, arrows: boolean) => {
      const u = model.eu[k];
      const v = model.ev[k];
      const x1 = X(u);
      const y1 = Y(u);
      const x2 = X(v);
      const y2 = Y(v);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      if (arrows && model.directed[k]) {
        const len = Math.hypot(x2 - x1, y2 - y1) || 1;
        const ux = (x2 - x1) / len;
        const uy = (y2 - y1) / len;
        const ax = x2 - ux * r;
        const ay = y2 - uy * r;
        const s = Math.min(9, 3 + 10 * scale);
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - ux * s - uy * s * 0.5, ay - uy * s + ux * s * 0.5);
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - ux * s + uy * s * 0.5, ay - uy * s - ux * s * 0.5);
      }
    };

    const arrows = scale > 0.35 && m < 6000;
    ctx.strokeStyle = m > 4000 ? "rgba(150, 160, 180, 0.22)" : "rgba(150, 160, 180, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < m; k++) drawEdge(k, arrows);
    ctx.stroke();

    if (highlight) {
      ctx.strokeStyle = highlight.color;
      ctx.lineWidth = Math.max(2.5, 4 * scale);
      ctx.beginPath();
      for (let k = 0; k < m; k++) {
        const a = nodes[model.eu[k]].id;
        const b = nodes[model.ev[k]].id;
        if (highlight.arcs.has(`${a}>${b}`) || (!model.directed[k] && highlight.arcs.has(`${b}>${a}`))) {
          drawEdge(k, true);
        }
      }
      ctx.stroke();
    }

    for (let i = 0; i < nodes.length; i++) {
      const x = X(i);
      const y = Y(i);
      if (x < -r || y < -r || x > w + r || y > h + r) continue;
      const id = nodes[i].id;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle =
        id === sourceId
          ? ROLE_COLORS.source
          : id === targetId
            ? ROLE_COLORS.target
            : highlight?.nodes.has(id)
              ? highlight.color
              : "#d4d7de";
      ctx.fill();
      if (r > 9 && nodes.length < 3000) {
        ctx.fillStyle = "#16161a";
        ctx.font = `700 ${Math.min(12, r * 0.6)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(model.labels[i].slice(0, 5), x, y);
      }
    }
    // Origem/destino sempre visíveis, mesmo com zoom pequeno.
    for (const [id, color] of [
      [sourceId, ROLE_COLORS.source],
      [targetId, ROLE_COLORS.target],
    ] as const) {
      const i = id ? model.index.get(id) : undefined;
      if (i === undefined) continue;
      ctx.beginPath();
      ctx.arc(X(i), Y(i), Math.max(r, 6) + 3, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }, [model, nodes, highlight, sourceId, targetId]);

  const schedule = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(draw);
  }, [draw]);

  const fit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < nodes.length; i++) {
      minX = Math.min(minX, model.xs[i]);
      maxX = Math.max(maxX, model.xs[i]);
      minY = Math.min(minY, model.ys[i]);
      maxY = Math.max(maxY, model.ys[i]);
    }
    const pad = 40;
    const scale = Math.min(
      (canvas.clientWidth - 2 * pad) / Math.max(1, maxX - minX),
      (canvas.clientHeight - 2 * pad) / Math.max(1, maxY - minY),
      2
    );
    viewRef.current = {
      scale,
      tx: canvas.clientWidth / 2 - ((minX + maxX) / 2) * scale,
      ty: canvas.clientHeight / 2 - ((minY + maxY) / 2) * scale,
    };
    schedule();
  }, [nodes.length, model, schedule]);

  // Reajusta ao trocar de grafo; só redesenha quando muda o destaque.
  useEffect(() => {
    fit();
  }, [model, fit]);
  useEffect(() => {
    schedule();
  }, [schedule]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const v = viewRef.current;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const scale = Math.min(8, Math.max(0.01, v.scale * factor));
      viewRef.current = {
        scale,
        tx: mx - ((mx - v.tx) * scale) / v.scale,
        ty: my - ((my - v.ty) * scale) / v.scale,
      };
      schedule();
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(canvas);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      ro.disconnect();
      cancelAnimationFrame(frameRef.current);
    };
  }, [schedule]);

  const dragRef = useRef<{ x: number; y: number } | null>(null);
  return (
    <>
      <CanvasSurface
        ref={canvasRef}
        aria-label={`Grafo com ${nodes.length} vértices e ${edges.length} arestas`}
        role="img"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragRef.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          const d = dragRef.current;
          if (!d) return;
          viewRef.current = {
            ...viewRef.current,
            tx: viewRef.current.tx + e.clientX - d.x,
            ty: viewRef.current.ty + e.clientY - d.y,
          };
          dragRef.current = { x: e.clientX, y: e.clientY };
          schedule();
        }}
        onPointerUp={() => (dragRef.current = null)}
        onPointerCancel={() => (dragRef.current = null)}
      />
      <FloatingButtons>
        <ActionButton type="button" $variant="secondary" onClick={fit}>
          Ajustar à tela
        </ActionButton>
      </FloatingButtons>
    </>
  );
}

export default GraphCanvasView;
