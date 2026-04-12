import React, { useState, useCallback, useEffect } from "react";
import type { NodeProps } from "reactflow";
import { Position, useReactFlow } from "reactflow";
import { toast } from "react-toastify";
import SimpleModal from "../SimpleModal/SimpleModal";
import { Circle, CustomHandle } from "./styles";
import { Field, Label, Input } from "../SimpleModal/styles";

export default function CustomNode({ id, data }: NodeProps<{ label: string }>) {
  const { setNodes } = useReactFlow();
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data.label ?? "");

  const showHandles = hovered || selected;

  useEffect(() => {
    if (!modalOpen) setDraftLabel(data.label ?? "");
  }, [data.label, modalOpen]);

  const updateLabel = useCallback(
    (newLabel: string) => {
      const trimmed = newLabel.trim();
      if (trimmed === "") return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, label: trimmed } } : n
        )
      );
    },
    [id, setNodes]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setDraftLabel(data.label ?? "");
      setModalOpen(true);
    },
    [data.label]
  );

  const handleConfirm = useCallback(() => {
    const trimmed = draftLabel.trim();
    if (trimmed === "") {
      toast.warning("O nome do nó não pode ficar vazio.");
      return;
    }
    updateLabel(trimmed);
    setModalOpen(false);
  }, [draftLabel, updateLabel]);

  return (
    <>
      <Circle
        tabIndex={0}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setSelected(true)}
        onBlur={() => setSelected(false)}
      >
        <span>{data.label}</span>

        {/* TOP */}
        <CustomHandle type="target" position={Position.Top} id="top-target-1" style={{ opacity: showHandles ? 1 : 0 }}/>
        <CustomHandle type="source" position={Position.Top} id="top-source-1" style={{ opacity: showHandles ? 1 : 0 }}/>

        {/* BOTTOM */}
        <CustomHandle type="target" position={Position.Bottom} id="bottom-target-1" style={{ opacity: showHandles ? 1 : 0 }}/>
        <CustomHandle type="source" position={Position.Bottom} id="bottom-source-1" style={{ opacity: showHandles ? 1 : 0 }}/>

        {/* LEFT */}
        <CustomHandle type="target" position={Position.Left} id="left-target-1" style={{ opacity: showHandles ? 1 : 0 }}/>
        <CustomHandle type="source" position={Position.Left} id="left-source-1" style={{ opacity: showHandles ? 1 : 0 }}/>

        {/* RIGHT */}
        <CustomHandle type="target" position={Position.Right} id="right-target-1" style={{ opacity: showHandles ? 1 : 0 }}/>
        <CustomHandle type="source" position={Position.Right} id="right-source-1" style={{ opacity: showHandles ? 1 : 0 }}/>
      </Circle>

      <SimpleModal
        open={modalOpen}
        title="Editar nome do nó"
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
      >
        <Field>
          <Label htmlFor={`node-label-${id}`}>Nome</Label>
          <Input
            id={`node-label-${id}`}
            type="text"
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
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
