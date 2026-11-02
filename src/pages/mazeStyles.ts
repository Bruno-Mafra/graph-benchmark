import styled from "styled-components";

export const ControlsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
`;

export const NumberField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;

  input {
    width: 110px;
    padding: 8px 10px;
    font-size: 14px;
    border-radius: 6px;
    border: 1px solid #444;
    background: #2a2a2a;
    color: #ffffff;
    box-sizing: border-box;
  }
`;

export const FieldHint = styled.span`
  font-size: 12px;
  color: #9a9a9a;
  line-height: 1.45;
`;

export const ActionButton = styled.button<{ $variant?: "primary" | "secondary" }>`
  padding: 9px 16px;
  font-size: 14px;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  color: #ffffff;
  border: 1px solid
    ${({ $variant }) => ($variant === "secondary" ? "#444" : "transparent")};
  background: ${({ $variant }) => ($variant === "secondary" ? "#2a2a2a" : "#2d4a8c")};

  &:hover:not(:disabled) {
    background: ${({ $variant }) => ($variant === "secondary" ? "#333" : "#3a5ba8")};
    border-color: ${({ $variant }) => ($variant === "secondary" ? "#555" : "transparent")};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const ToolGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`;

export const ToolGroupLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #8b8b9a;
  margin-right: 4px;
`;

export const ModeButton = styled.button<{ $active: boolean; $swatch?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 7px;
  cursor: pointer;
  color: ${({ $active }) => ($active ? "#ffffff" : "#cccccc")};
  background: ${({ $active }) => ($active ? "#333333" : "transparent")};
  border: 1px solid ${({ $active }) => ($active ? "#ffffff" : "#444")};

  &:hover:not(:disabled) {
    border-color: #888;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &::before {
    content: "";
    display: ${({ $swatch }) => ($swatch ? "block" : "none")};
    width: 12px;
    height: 12px;
    border-radius: 3px;
    background: ${({ $swatch }) => $swatch ?? "transparent"};
    border: 1px solid #555;
  }
`;

export const Legend = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  color: #cccccc;
`;

export const LegendItem = styled.li<{ $color: string; $round?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;

  &::before {
    content: "";
    width: 12px;
    height: 12px;
    border-radius: ${({ $round }) => ($round ? "50%" : "3px")};
    background: ${({ $color }) => $color};
    border: 1px solid #555;
  }
`;

export const GridStats = styled.p`
  margin: 0;
  font-size: 12px;
  color: #9a9a9a;
  font-variant-numeric: tabular-nums;
`;

export const InfoBanner = styled.div`
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(91, 140, 255, 0.1);
  border: 1px solid rgba(91, 140, 255, 0.4);
  color: #d6e0ff;
  font-size: 13px;
  line-height: 1.45;
`;

export const StatusBanner = styled.div<{ $ok: boolean }>`
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.45;
  background: ${({ $ok }) => ($ok ? "rgba(74, 222, 128, 0.12)" : "#3d2a1a")};
  border: 1px solid ${({ $ok }) => ($ok ? "rgba(74, 222, 128, 0.45)" : "#8b6914")};
  color: ${({ $ok }) => ($ok ? "#c8f7d6" : "#f5e6c8")};
`;

export const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;

  @media (max-width: 400px) {
    grid-template-columns: 1fr;
  }
`;
