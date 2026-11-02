import styled from "styled-components";

export const PickerGroups = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

export const GroupTitle = styled.h4`
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #8b8b9a;
`;

export const AlgoCardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
`;

export const AlgoCard = styled.label<{ $selected: boolean; $accent: string; $disabled: boolean }>`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: 8px;
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
  border: 1px solid ${({ $selected }) => ($selected ? "#ffffff" : "#333333")};
  border-left: 4px solid ${({ $selected, $accent }) => ($selected ? $accent : "#333333")};
  background: ${({ $selected }) => ($selected ? "#2c2c32" : "transparent")};
  transition: border-color 0.15s ease, background 0.15s ease;

  input {
    margin: 3px 0 0;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    cursor: inherit;
  }
`;

export const AlgoCardText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;

  strong {
    font-size: 14px;
    color: #ffffff;
  }

  span {
    font-size: 12px;
    line-height: 1.4;
    color: #a0a0ae;
  }
`;

export const Tag = styled.em<{ $color: string }>`
  align-self: flex-start;
  font-style: normal;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: 4px;
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => $color};
  opacity: 0.85;
`;

export const ParamsPanel = styled.fieldset<{ $accent: string }>`
  margin: 0;
  padding: 14px 16px 16px;
  border-radius: 8px;
  border: 1px solid #3d3d48;
  border-left: 4px solid ${({ $accent }) => $accent};
  background: #222228;

  legend {
    padding: 0 6px;
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
  }
`;

export const ParamsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px 16px;
`;

export const ParamField = styled.label<{ $invalid: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;

  input {
    padding: 7px 9px;
    font-size: 14px;
    border-radius: 6px;
    border: 1px solid ${({ $invalid }) => ($invalid ? "#f87171" : "#444")};
    background: #2a2a2a;
    color: #ffffff;
  }

  small {
    font-size: 11px;
    font-weight: 400;
    line-height: 1.4;
    color: #9a9aa8;
  }

  small[role="alert"] {
    color: #fca5a5;
  }
`;
