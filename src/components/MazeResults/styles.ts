import styled from "styled-components";

export const ViewToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const ThumbGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
`;

export const ThumbCard = styled.button<{ $accent: string }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  text-align: left;
  font: inherit;
  color: inherit;
  border-radius: 10px;
  border: 1px solid #3a3a3a;
  border-top: 3px solid ${({ $accent }) => $accent};
  background: #222228;
  cursor: pointer;
  min-width: 0;

  &:hover {
    border-color: #777;
    border-top-color: ${({ $accent }) => $accent};
  }
`;

export const ThumbTitle = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;

  strong {
    font-size: 14px;
    color: #ffffff;
  }

  span {
    font-size: 11px;
    color: #9a9aa8;
  }
`;

export const ThumbStats = styled.div<{ $ok: boolean }>`
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${({ $ok }) => ($ok ? "#d0d0da" : "#fbbf24")};
`;

export const SingleLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(300px, 2fr);
  gap: 16px;
  align-items: start;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`;

export const SingleCanvasColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
`;
