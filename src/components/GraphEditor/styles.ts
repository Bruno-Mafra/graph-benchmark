import styled, { css } from "styled-components";

export const ROLE_COLORS = {
  source: "#4ade80",
  target: "#f87171",
} as const;

export const EditorShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const EditorToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #333;
  background: #202024;
`;

export const ToolbarGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`;

export const ToolbarSelect = styled.select`
  padding: 7px 8px;
  font-size: 13px;
  border-radius: 7px;
  border: 1px solid #444;
  background: #2a2a2a;
  color: #fff;
`;

export const Frame = styled.div<{ $mode: string }>`
  position: relative;
  width: 100%;
  height: 620px;
  border-radius: 10px;
  border: 1px solid #333;
  overflow: hidden;
  background: #141418;

  @media (max-width: 640px) {
    height: 460px;
  }

  .react-flow__pane {
    cursor: ${({ $mode }) =>
      $mode === "add" ? "crosshair" : $mode === "delete" ? "no-drop" : "grab"};
  }

  .react-flow__node {
    cursor: ${({ $mode }) =>
      $mode === "delete" ? "no-drop" : $mode === "source" || $mode === "target" ? "pointer" : "grab"};
  }

  .react-flow__edge {
    cursor: ${({ $mode }) => ($mode === "delete" ? "no-drop" : "pointer")};
  }

  .react-flow__controls button {
    background: #2a2a2a;
    border-bottom: 1px solid #3a3a3a;
    fill: #ddd;
  }

  .react-flow__controls button:hover {
    background: #3a3a3a;
  }
`;

export const ModeHint = styled.div`
  position: absolute;
  z-index: 5;
  left: 12px;
  top: 12px;
  max-width: calc(100% - 24px);
  padding: 6px 10px;
  border-radius: 7px;
  font-size: 12px;
  color: #e5e5e5;
  background: rgba(20, 20, 24, 0.85);
  border: 1px solid #3a3a3a;
  pointer-events: none;
`;

export const NodeCircle = styled.div<{
  $selected: boolean;
  $role: "source" | "target" | "both" | null;
  $pathColor: string | null;
}>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  box-sizing: border-box;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  color: #16161a;
  background: ${({ $pathColor }) => $pathColor ?? "#e5e7eb"};
  border: 2px solid ${({ $selected }) => ($selected ? "#5b8cff" : "#111")};
  box-shadow: ${({ $role }) =>
    $role === "source"
      ? `0 0 0 4px ${ROLE_COLORS.source}`
      : $role === "target"
        ? `0 0 0 4px ${ROLE_COLORS.target}`
        : $role === "both"
          ? `0 0 0 3px ${ROLE_COLORS.source}, 0 0 0 7px ${ROLE_COLORS.target}`
          : "none"};

  span {
    max-width: 40px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 2px;
  }

  .graph-handle {
    width: 9px;
    height: 9px;
    background: #5b8cff;
    border: 2px solid #111;
    opacity: 0;
    transition: opacity 0.12s;
  }

  &:hover .graph-handle {
    opacity: 1;
  }

  ${({ $selected }) =>
    $selected &&
    css`
      .graph-handle {
        opacity: 1;
      }
    `}
`;

export const EdgeLabel = styled.div<{ $highlight: string | null; $selected: boolean }>`
  position: absolute;
  pointer-events: none;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 700;
  line-height: 16px;
  border-radius: 4px;
  color: ${({ $highlight }) => ($highlight ? "#16161a" : "#e5e5e5")};
  background: ${({ $highlight }) => $highlight ?? "#26262c"};
  border: 1px solid ${({ $selected }) => ($selected ? "#ffffff" : "#3a3a44")};
`;

export const CanvasSurface = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`;

export const FloatingButtons = styled.div`
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  gap: 6px;
`;

export const LegendRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  font-size: 12px;
  color: #a0a0ae;
`;
