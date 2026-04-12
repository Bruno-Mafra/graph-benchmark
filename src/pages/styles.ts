import styled from 'styled-components';

export const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: auto;
  width: 100vw;
  height: 100vh;
  gap: 40px;
`;

export const PageHeader = styled.div`
  display: flex;
  background-color: #1a1a1a;
  width: 100%;
  height: 80px;
  min-height: 80px;
`;

export const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  box-sizing: border-box;
  margin: 0 auto;
  max-width: 1280px;
  padding: 0px 24px;
  width: 100%;
  gap: 16px;
  height: 100%;

  img {
    width: 75px;
    height: 75px;
  }

  h1 {
    font-size: 24px;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 20px;
  }

  @media (max-width: 768px) {
    padding: 0px 16px;
  }

  @media (max-width: 480px) {
    padding: 0px 12px;
  }

  @media (max-width: 320px) {
    padding: 0px 8px;
  }
`;

export const PageContent = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  max-width: 1280px;
  padding: 0px 24px;
  width: 100%;
  height: 100%;
  gap: 40px;

  @media (max-width: 768px) {
    padding: 0px 16px;
  }

  @media (max-width: 480px) {
    padding: 0px 12px;
  }

  @media (max-width: 320px) {
    padding: 0px 8px;
  }
`;

export const CreateGraphContainer = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: #1a1a1a;
  padding: 24px;
  border-radius: 12px;
  width: 100%;
  gap: 24px;

  p {
    font-size: 16px;
    font-weight: 400;
    color: #ffffff;
    margin: 0px;
  }

  h2 {
    font-size: 24px;
    line-height: 32px;
    font-weight: 700;
    color: #ffffff;
    margin: 0px;
  }
`;

export const RadioLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  p {
    margin: 0px;
    font-size: 16px;
    font-weight: 700;
    color: #ffffff;
  }
`;

export const Divider = styled.div`
  width: 100%;
  height: 1px;
  background-color: #333333;
`;

export const HiddenRadio = styled.input.attrs({ type: "radio" })`
  display: none;
`;

export const CustomRadio = styled.span`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: black;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  ${HiddenRadio}:checked + &::after {
    opacity: 1;
  }
`;

export const OptionsWrapper = styled.div`
  display: flex;
  flex-direction: row;
  box-sizing: border-box;
  width: 100%;
  gap: 10px;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

export const OptionBox = styled.label<{ isSelected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  box-sizing: border-box;
  cursor: pointer;

  border: 1px solid #333333;
  border-color: ${({ isSelected }) => (isSelected ? "#ffffff" : "#333333")};
  background-color: ${({ isSelected }) =>
    isSelected ? "#333333" : "transparent"};

  border-radius: 8px;
  padding: 16px;
  width: 100%;
  gap: 10px;

  > p {
    margin: 0px;
    font-size: 14px;
    font-weight: 400;
    color: #ffffff;
  }
`;

export const UploadPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
`;

export const FileSelectButton = styled.button`
  align-self: flex-start;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background: #2d4a8c;
  border: none;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: #3a5ba8;
  }
`;

/** Barra acima do canvas na aba do editor. */
export const EditorToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
`;

export const PresetModelButton = styled(FileSelectButton)`
  background: #3d4f6e;

  &:hover {
    background: #4d5f82;
  }
`;

export const DropZone = styled.div<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 200px;
  padding: 36px 28px;
  border-radius: 12px;
  border: 2px dashed
    ${({ $active }) => ($active ? "#6b8cce" : "#555555")};
  background: ${({ $active }) =>
    $active ? "rgba(107, 140, 206, 0.12)" : "rgba(0, 0, 0, 0.25)"};
  transition: border-color 0.15s ease, background 0.15s ease;
`;

export const DropZoneFileButton = styled(FileSelectButton)`
  align-self: center;
`;

export const DropHint = styled.p`
  margin: 0;
  text-align: center;
  font-size: 13px;
  line-height: 1.55;
  color: #999999;
  max-width: 360px;
`;

export const FormatInstructions = styled.div`
  font-size: 13px;
  line-height: 1.55;
  color: #cccccc;

  ul {
    margin: 8px 0 0;
    padding-left: 20px;
  }

  code {
    font-family: ui-monospace, monospace;
    font-size: 12px;
    background: #2a2a2a;
    padding: 2px 6px;
    border-radius: 4px;
    color: #e0e0e0;
  }
`;

export const JsonExample = styled.pre`
  margin: 12px 0 0;
  padding: 14px;
  font-size: 11px;
  line-height: 1.45;
  overflow-x: auto;
  background: #0d0d0d;
  border: 1px solid #333;
  border-radius: 8px;
  color: #c8e0c8;
`;

export const BenchmarkContainer = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: #1a1a1a;
  padding: 24px;
  border-radius: 12px;
  width: 100%;
  gap: 24px;

  h2 {
    font-size: 24px;
    line-height: 32px;
    font-weight: 700;
    color: #ffffff;
    margin: 0;
  }
`;

export const BenchmarkParagraph = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  color: #cccccc;
  line-height: 1.5;
`;

export const AlgorithmCheckboxList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: #ffffff;
  font-size: 14px;
  user-select: none;

  input {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
`;

export const StartBenchmarkButton = styled.button`
  align-self: flex-start;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background: #2d4a8c;
  border: none;
  border-radius: 8px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #3a5ba8;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const ResultsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

/** Lista ordenada (melhor tempo primeiro) com barras relativas. */
export const ResultsRankList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const ResultRankCard = styled.div<{ $rank: number }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: ${({ $rank }) =>
    $rank === 1
      ? "linear-gradient(145deg, rgba(74, 222, 128, 0.12) 0%, #252525 55%)"
      : "#2a2a2a"};
  border-radius: 10px;
  border: 1px solid
    ${({ $rank }) =>
      $rank === 1 ? "rgba(74, 222, 128, 0.4)" : "#3a3a3a"};
`;

export const ResultRankTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

export const ResultRankLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

export const RankBadge = styled.span<{ $rank: number }>`
  flex-shrink: 0;
  min-width: 36px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
  border-radius: 6px;
  background: ${({ $rank }) =>
    $rank === 1 ? "rgba(74, 222, 128, 0.25)" : "#3a3a3a"};
  color: ${({ $rank }) => ($rank === 1 ? "#b6f5c8" : "#ccc")};
  border: 1px solid
    ${({ $rank }) =>
      $rank === 1 ? "rgba(74, 222, 128, 0.45)" : "#4a4a4a"};
`;

export const ResultRankLabel = styled.span`
  font-weight: 600;
  font-size: 14px;
  color: #ffffff;
`;

export const ResultRankTime = styled.span`
  font-variant-numeric: tabular-nums;
  color: #a8c4ff;
  font-weight: 600;
  font-size: 14px;
`;

export const PerfBarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const PerfBarTrack = styled.div`
  flex: 1;
  min-width: 0;
  max-width: 320px;
  height: 9px;
  border-radius: 5px;
  background: #1a1a1a;
  overflow: hidden;
  border: 1px solid #333;
`;

export const PerfBarFill = styled.div<{ $widthPct: number; $color: string }>`
  height: 100%;
  width: ${({ $widthPct }) => Math.min(100, Math.max(0, $widthPct))}%;
  background: ${({ $color }) => $color};
  border-radius: 4px;
  opacity: 0.92;
`;

export const PerfBarCaption = styled.span`
  font-size: 11px;
  color: #888;
  line-height: 1.3;
`;

export const ResultItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #2a2a2a;
  border-radius: 8px;
  color: #ffffff;
  font-size: 14px;
`;

export const ResultLabel = styled.span`
  font-weight: 500;
`;

export const ResultTime = styled.span`
  font-variant-numeric: tabular-nums;
  color: #a8c4ff;
  font-weight: 600;
`;

export const ResultsHeading = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
`;

export const SourceRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
`;

export const SourceLabel = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
`;

export const SourceSelect = styled.select`
  padding: 8px 10px;
  font-size: 14px;
  border-radius: 6px;
  border: 1px solid #444;
  background: #2a2a2a;
  color: #ffffff;
  cursor: pointer;
`;

export const WarningBanner = styled.div`
  padding: 12px 14px;
  border-radius: 8px;
  background: #3d2a1a;
  border: 1px solid #8b6914;
  color: #f5e6c8;
  font-size: 13px;
  line-height: 1.45;
`;

export const MetricsBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: #252525;
  border-radius: 8px;
  border: 1px solid #333;
  font-size: 13px;
  color: #dddddd;
  line-height: 1.5;
`;

export const MetricsTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
`;

export const SkippedReason = styled.div`
  padding: 12px 14px;
  background: #2a2520;
  border: 1px solid #665544;
  border-radius: 8px;
  color: #e8c9a8;
  font-size: 13px;
`;

export const DistancesTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: #ffffff;

  th,
  td {
    padding: 8px 10px;
    text-align: left;
    border-bottom: 1px solid #333;
  }

  th {
    color: #aaaaaa;
    font-weight: 600;
  }

  td {
    font-variant-numeric: tabular-nums;
  }
`;

export const DistancesTableRow = styled.tr<{ $isSource?: boolean }>`
  background: ${({ $isSource }) =>
    $isSource ? "rgba(74, 222, 128, 0.14)" : "transparent"};
  box-shadow: ${({ $isSource }) =>
    $isSource ? "inset 3px 0 0 #4ade80" : "none"};
`;

export const DistancesShowMoreButton = styled.button`
  margin-top: 10px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #e5e5e5;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: #333;
    border-color: #555;
  }
`;

export const ChartSection = styled.div`
  width: 100%;
  margin-top: 8px;
`;

export const SubSectionTitle = styled.h4`
  margin: 16px 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
`;