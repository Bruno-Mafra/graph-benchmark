import React, { memo, useState, useCallback, useEffect } from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
  useReactFlow,
} from "reactflow";
import type { EdgeProps } from "reactflow";
import { toast } from "react-toastify";
import SimpleModal from "../SimpleModal/SimpleModal";
import { StyledLabel } from "./styles";
import { Field, Label, Input } from "../SimpleModal/styles";

export type WeightedEdgeData = {
  weight?: number;
  /** Mesmo peso no sentido inverso (lista de adjacência duplicada no export). */
  bidirectional?: boolean;
};

function WeightedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
  markerStart,
  interactionWidth,
}: EdgeProps<WeightedEdgeData>) {
  const { setEdges } = useReactFlow();

  const weight = typeof data?.weight === "number" ? data.weight : 1;

  const [modalOpen, setModalOpen] = useState(false);
  const [draftWeight, setDraftWeight] = useState(String(weight));

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,
  });

  useEffect(() => {
    if (!modalOpen) setDraftWeight(String(weight));
  }, [weight, modalOpen]);

  const updateWeight = useCallback(
    (newWeight: number) => {
      setEdges((edges) =>
        edges.map((edge) =>
          edge.id === id
            ? { ...edge, data: { ...edge.data, weight: newWeight } }
            : edge
        )
      );
    },
    [id, setEdges]
  );

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDraftWeight(String(weight));
    setModalOpen(true);
  }, [weight]);

  const handleConfirm = useCallback(() => {
    const parsed = Number.parseFloat(draftWeight.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      toast.warning("Informe um peso numérico válido.");
      return;
    }
    updateWeight(parsed);
    setModalOpen(false);
  }, [draftWeight, updateWeight]);

  return (
    <>
      <BaseEdge
        path={path}
        style={style}
        markerEnd={markerEnd}
        markerStart={markerStart}
        interactionWidth={interactionWidth}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
          onDoubleClick={handleDoubleClick}
        >
          <StyledLabel>{weight}</StyledLabel>
        </div>
      </EdgeLabelRenderer>

      <SimpleModal
        open={modalOpen}
        title="Editar peso da aresta"
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
      >
        <Field>
          <Label htmlFor={`edge-weight-${id}`}>Peso (numérico)</Label>
          <Input
            id={`edge-weight-${id}`}
            type="number"
            value={draftWeight}
            onChange={(e) => setDraftWeight(e.target.value)}
            step={0.1}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirm();
              e.stopPropagation();
            }}
            autoFocus
          />
        </Field>
      </SimpleModal>
    </>
  );
}

export default memo(WeightedEdge);
