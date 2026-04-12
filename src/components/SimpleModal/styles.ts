import styled from "styled-components";

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
`;

export const Dialog = styled.div`
  min-width: 280px;
  max-width: 90vw;
  padding: 20px;
  border-radius: 10px;
  background: #1e1e1e;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  border: 1px solid #2a2a2a;
`;

export const Title = styled.h3`
  margin: 0 0 14px;
  font-size: 16px;
  font-weight: 600;
  color: #f5f5f5;
`;

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
`;

export const Label = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: #cfcfcf;
`;

export const Input = styled.input`
  padding: 8px 10px;
  font-size: 14px;
  border: 1px solid #444;
  border-radius: 6px;
  outline: none;
  background: #111111;
  color: #f5f5f5;

  &:focus {
    border-color: #888;
    background: #111111;
  }
`;

export const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
`;

export const Button = styled.button<{ $primary?: boolean }>`
  padding: 8px 16px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid ${({ $primary }) => ($primary ? "#3a3a3a" : "#555")};
  background: ${({ $primary }) => ($primary ? "#4ade80" : "#2a2a2a")};
  color: ${({ $primary }) => ($primary ? "#111" : "#e5e5e5")};

  &:hover {
    opacity: 0.9;
  }
`;