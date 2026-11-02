import styled from "styled-components";

export const Node = styled.div<{ x: number; y: number }>`
  position: fixed;
  left: ${({ x }) => x}px;
  top: ${({ y }) => y}px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(100, 100, 255, 0.3);
  border: 2px dashed rgba(100, 100, 255, 0.6);
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: background-color 0.2s ease;
  z-index: 1000;
`;