import styled from "styled-components";

export const MAZE_COLORS = {
  empty: "#2f3240",
  wall: "#0e0f13",
  explored: "#34508f",
  path: "#facc15",
  start: "#4ade80",
  goal: "#f87171",
  gridLine: "rgba(0, 0, 0, 0.35)",
} as const;

export const Viewport = styled.div`
  width: 100%;
  max-height: 760px;
  overflow: auto;
  border-radius: 10px;
  border: 1px solid #333;
  background: #0d0d0d;
`;

export const CanvasHolder = styled.div`
  display: flex;
  justify-content: center;
  padding: 8px;
  width: max-content;
  min-width: 100%;
  box-sizing: border-box;
`;

export const StyledCanvas = styled.canvas<{ $editable: boolean }>`
  display: block;
  image-rendering: pixelated;
  touch-action: none;
  cursor: ${({ $editable }) => ($editable ? "crosshair" : "default")};
`;
