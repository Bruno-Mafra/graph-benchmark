import { useEffect, useRef, useState } from "react";
import { Node } from "./styles";

type Props = {
  addingNode: boolean;
  mousePos: { x: number; y: number };
}

function GhostNode({ addingNode, mousePos }: Props) {
  const [pos, setPos] = useState(mousePos);

  const rafRef = useRef<number>(null);

  useEffect(() => {
    if (!addingNode) return;

    const smoothFollow = () => {
      setPos((prev) => {
        const lerp = 0.15; // suavidade (0.1 a 0.3 é bom)
        const x = prev.x + (mousePos.x - prev.x) * lerp;
        const y = prev.y + (mousePos.y - prev.y) * lerp;
        return { x, y };
      });
      rafRef.current = requestAnimationFrame(smoothFollow);
    };

    rafRef.current = requestAnimationFrame(smoothFollow);

    return () => cancelAnimationFrame(rafRef.current!);
  }, [addingNode, mousePos]);

  if (!addingNode) return null;

  return (
    <Node x={pos.x} y={pos.y} />
  );
}

export default GhostNode;