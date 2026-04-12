import { Handle } from 'reactflow';
import styled from 'styled-components';

export const Circle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 100%;
  min-width: 40px;
  min-height: 40px;
  padding: 5px;
  border: 2px solid #111111;
  background-color: #e5e7eb;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: #222222;
`;

export const CustomHandle = styled(Handle)`
  background-color: #e5e7eb;
  width: 3px;
  height: 3px;
  border-radius: 100%;
  border: 2px solid #111111;
  transition: opacity 0.15s;
`;

export const CustomInput = styled.input`
  max-width: 80px;
  min-width: fit-content;
  padding: 2px 4px;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  border: 1px solid #555;
  border-radius: 4px;
  outline: none;
  background: black;
`;
