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
    gap: 10px;

    img {
      width: 48px;
      height: 48px;
    }

    h1 {
      font-size: 16px;
      line-height: 1.2;
      margin-bottom: 0;
    }
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

  > p {
    font-size: 16px;
    font-weight: 400;
    color: #ffffff;
    margin: 0px;
  }

  > h2 {
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
  gap: 24px;
`;

export const FileSelectButton = styled.button`
  align-self: flex-start;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  background: #2d4a8c;
  border: none;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: #3a5ba8;
  }
`;

export const EditorToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
`;

export const DropZone = styled.div<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 200px;
  padding: 12px 28px;
  border-radius: 12px;
  border: 2px dashed
    ${({ $active }) => ($active ? "#6b8cce" : "#555555")};
  background: ${({ $active }) =>
    $active ? "rgba(107, 140, 206, 0.12)" : "rgba(0, 0, 0, 0.25)"};
  transition: border-color 0.15s ease, background 0.15s ease;
`;

export const DropZoneIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: -8px;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  color: #9bb4e0;

  & svg {
    width: 32px;
    height: 32px;
  }
`;

export const DropZoneFileButton = styled(FileSelectButton)`
  align-self: center;
  font-size: 14px;
  font-weight: 700;
`;

export const DropHint = styled.p`
  margin: 0;
  text-align: center;
  font-size: 13px;
  line-height: 1.55;
  color: #cccccc;
  max-width: 360px;
`;

export const DropHintDescription = styled.p`
  margin-top: -8px;
  font-size: 12px;
  font-weight: 400;
  color: #999999;
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
  margin: 0 0 0;
  padding: 14px;
  font-size: 11px;
  line-height: 1.45;
  overflow-x: auto;
  background: #0d0d0d;
  border: 1px solid #333;
  border-radius: 8px;
  color: #c8e0c8;
`;

export const SectionContainer = styled.div`
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

export const EmptySectionContainer = styled(SectionContainer)`
  background-color: transparent;
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
  font-weight: 700;
  color: #ffffff;
  background: #2d4a8c;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;

  &:hover:not(:disabled) {
    background: #3a5ba8;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/** Lista ordenada (melhor tempo primeiro) com barras relativas. */
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

export const MetricsAlgoCard = styled.article<{ $accent: string }>`
  border-radius: 6px 12px 12px 6px;
  padding: 16px 18px;
  background: linear-gradient(165deg, #2c2c32 0%, #1f1f24 100%);
  border: 1px solid #3d3d48;
  border-left: 4px solid ${({ $accent }) => $accent};
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
`;

export const MetricsAlgoTitle = styled.h4`
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.02em;
`;

export const MetricsAlgoHint = styled.p`
  margin: 0 0 14px;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 500;
  color: #8e8e9c;
`;

export const MetricsStatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 14px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const MetricsStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

export const MetricsStatLabel = styled.span`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #8b8b9a;
  line-height: 1.3;
`;

export const MetricsStatValueRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
`;

export const MetricsStatNumber = styled.span`
  font-size: 17px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #ececf2;
  line-height: 1.2;
`;

export const MetricsStatUnit = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #9a9aa8;
`;

export const SkippedReason = styled.div`
  padding: 12px 14px;
  background: #2a2520;
  border: 1px solid #665544;
  border-radius: 8px;
  color: #e8c9a8;
  font-size: 13px;
`;

export const TitleContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

export const SubSectionTitle = styled.h4<{ $margin?: string }>`
  margin: ${({ $margin }) => $margin || "16px 0 8px"};
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
`;
export const TabBar = styled.nav`
  display: flex;
  gap: 4px;
  margin-left: auto;
  padding: 4px;
  border-radius: 10px;
  background: #242424;
  border: 1px solid #333333;
`;

export const TabButton = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 700;
  border-radius: 7px;
  border: none;
  color: ${({ $active }) => ($active ? "#ffffff" : "#aaaaaa")};
  background: ${({ $active }) => ($active ? "#2d4a8c" : "transparent")};
  cursor: pointer;

  &:hover {
    color: #ffffff;
    background: ${({ $active }) => ($active ? "#3a5ba8" : "#333333")};
  }

  @media (max-width: 480px) {
    padding: 6px 10px;
    font-size: 13px;
  }
`;
