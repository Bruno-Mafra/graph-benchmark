import styled from "styled-components";

export const TableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
  border: 1px solid #333;
  border-radius: 8px;
`;

export const ComparisonTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: #ffffff;
  white-space: nowrap;

  th,
  td {
    padding: 9px 10px;
    text-align: left;
    border-bottom: 1px solid #333;
    vertical-align: top;
  }

  th {
    color: #aaaaaa;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: #202020;
  }

  td {
    font-variant-numeric: tabular-nums;
  }

  td.num,
  th.num {
    text-align: right;
  }

  td.wrap {
    white-space: normal;
    min-width: 170px;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
`;

export const ClickableRow = styled.tr<{ $selected: boolean }>`
  cursor: pointer;
  background: ${({ $selected }) => ($selected ? "rgba(91, 140, 255, 0.12)" : "transparent")};

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

export const AlgoName = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;

  &::before {
    content: "";
    width: 10px;
    height: 10px;
    border-radius: 3px;
    background: ${({ $color }) => $color};
  }
`;

export const Badge = styled.span<{ $color: string }>`
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 4px;
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => $color};
  vertical-align: 1px;
`;

export const SubValue = styled.div`
  font-size: 11px;
  color: #9a9aa8;
  margin-top: 2px;
`;

export const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 14px;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

export const ChartCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid #333;
  background: #202024;
  min-width: 0;
`;

export const ChartTitle = styled.h5`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
`;

export const ChartNote = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: #9a9aa8;
`;

export const RunsDetails = styled.details`
  border: 1px solid #333;
  border-radius: 8px;
  padding: 10px 12px;
  background: #1f1f23;

  summary {
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
  }

  ${TableScroll} {
    margin-top: 10px;
  }
`;
