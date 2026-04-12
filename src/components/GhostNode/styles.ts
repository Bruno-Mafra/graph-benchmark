import styled from "styled-components";

export const NodeDeprecated = styled.div<{ x: number; y: number }>`
  position: absolute;
  left: ${(p) => p.x}px;
  top: ${(p) => p.y}px;
  width: 100px;
  height: 100px;
  background: rgba(0, 150, 255, 0.3);
  border: 2px dashed #0096ff;
  border-radius: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: 0.05s linear;
`;

export const Node = styled.div<{ x: number; y: number }>`
  position: fixed;
  left: ${({ x }) => x}px;
  top: ${({ y }) => y}px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(100, 100, 255, 0.3);
  border: 2px dashed rgba(100, 100, 255, 0.6);
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: background-color 0.2s ease;
  z-index: 1000;
`;