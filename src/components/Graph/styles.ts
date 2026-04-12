import styled from "styled-components";

export const Wrapper = styled.div`
  position: relative;
  width: 100%;
  height: 600px;
  overflow: hidden;
`;

export const MenuContainer = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  background: #eeeeee;
  border-radius: 6px;
  opacity: 0.9;
  padding: 6px;
  z-index: 10;
  gap: 12px;
  left: 15px;
  top: 15px;
`;

export const MenuButton = styled.button<{ isSelected?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ isSelected }) => isSelected ? 'black' : '#eeeeee'};
  border-radius: 6px;
  cursor: pointer;
  border: none;
  outline: none;
  padding: 8px;
  width: 100%;
  height: 100%;
  opacity: 0.9;

  > svg > path {
    fill: ${({ isSelected }) => isSelected ? 'white' : 'black'};
  }

  &:hover {
    background-color: ${({ isSelected }) => isSelected ? 'black' : '#dddddd'};
    border: none;
    outline: none;
  }

  &:focus {
    border: none;
    outline: none;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;

export const FlowWrapper = styled.div<{ $mode: string }>`
  width: 100%;
  height: 100%;

  .react-flow__pane {
    ${({ $mode }) =>
      $mode === "add" &&
      `
        cursor: crosshair;
      `}

    ${({ $mode }) =>
      $mode === "delete" &&
      `
        cursor: no-drop;
      `}
  }

  .react-flow__node {
    ${({ $mode }) =>
      $mode === "add" &&
      `
        cursor: crosshair;
      `}

    ${({ $mode }) =>
      $mode === "delete" &&
      `
        cursor: no-drop;
      `}
  }

  .react-flow__edge {
    ${({ $mode }) =>
      $mode === "add" &&
      `
        cursor: crosshair;
      `}

    ${({ $mode }) =>
      $mode === "delete" &&
      `
        cursor: no-drop;
      `}
  }
`;

export const Divider = styled.div`
  width: 90%;
  height: 2px;
  background-color: #999999;
  margin: 0 auto;
`;