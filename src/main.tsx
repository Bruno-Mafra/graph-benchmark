import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import GraphBenchmark from './pages/GraphBenchmark.tsx';
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GraphBenchmark />
  </StrictMode>,
)
