import { GRAPH_ALGORITHMS, GRAPH_ALGORITHM_IDS, PROBLEM_LABELS } from "../../graph/algorithms/registry";
import { GRAPH_ALGORITHM_COLORS } from "../../graph/algorithms/colors";
import type { Compatibility, GraphAlgorithmId, ProblemKind } from "../../graph/algorithms/types";
import { PickerGroups, GroupTitle, AlgoCardGrid, AlgoCard, AlgoCardText, Tag } from "../MazeAlgorithmPicker/styles";
import { FieldHint } from "../../pages/mazeStyles";
import styled from "styled-components";

/**
 * Cartões largos (até 3 por linha no desktop); auto-fit estica seções com
 * menos cartões para ocupar a largura.
 */
const CardGrid = styled(AlgoCardGrid)`
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));

  @media (max-width: 400px) {
    grid-template-columns: 1fr;
  }
`;

const ReasonText = styled.div<{ $color: string }>`
  font-size: 12px;
  line-height: 1.4;
  color: ${({ $color }) => $color};
`;

type Props = {
  selected: Record<GraphAlgorithmId, boolean>;
  compatibility: Record<GraphAlgorithmId, Compatibility>;
  onToggle: (id: GraphAlgorithmId, checked: boolean) => void;
  disabled: boolean;
};

const PROBLEMS: ProblemKind[] = ["sssp", "p2p", "apsp"];

/**
 * Algoritmos agrupados pelo problema que resolvem. Incompatíveis ficam
 * bloqueados com o motivo; a marcação do usuário continua visível (e volta a
 * valer quando o grafo ou a consulta mudam), mas eles não são executados.
 */
function GraphAlgorithmPicker({ selected, compatibility, onToggle, disabled }: Props) {
  return (
    <PickerGroups>
      {PROBLEMS.map((problem) => (
        <div key={problem}>
          <GroupTitle>{PROBLEM_LABELS[problem].title}</GroupTitle>
          <FieldHint as="p" style={{ margin: "-4px 0 8px" }}>
            {PROBLEM_LABELS[problem].description}
          </FieldHint>
          <CardGrid>
            {GRAPH_ALGORITHM_IDS.filter((id) => GRAPH_ALGORITHMS[id].problem === problem).map((id) => {
              const a = GRAPH_ALGORITHMS[id];
              const compat = compatibility[id];
              const blocked = !compat.ok;
              return (
                <AlgoCard
                  key={id}
                  $selected={selected[id] && !blocked}
                  style={blocked ? { borderStyle: "dashed" } : undefined}
                  $accent={GRAPH_ALGORITHM_COLORS[id]}
                  $disabled={disabled || blocked}
                  title={blocked ? compat.reason : a.requirements}
                >
                  <input
                    type="checkbox"
                    checked={selected[id]}
                    disabled={disabled || blocked}
                    onChange={(e) => onToggle(id, e.target.checked)}
                  />
                  <AlgoCardText>
                    <strong>
                      {a.label} <span style={{ fontWeight: 500, fontSize: 11 }}>{a.complexity}</span>
                    </strong>
                    <span>{a.description}</span>
                    {a.experimental && (
                      <ReasonText $color="#7dd3fc" title={a.experimental}>
                        <Tag $color="#38bdf8">Experimental</Tag> mais lento que o Dijkstra; veja os detalhes após executar.
                      </ReasonText>
                    )}
                    {blocked ? (
                      <ReasonText $color="#fca5a5">
                        Indisponível neste grafo/consulta{selected[id] ? " (seleção mantida, não será executado)" : ""}:{" "}
                        {compat.reason}
                      </ReasonText>
                    ) : (
                      <>
                        <Tag $color="#86efac">Compatível</Tag>
                        <ReasonText $color="#9a9aa8">Requisitos: {a.requirements}</ReasonText>
                        {compat.note && <ReasonText $color="#fbbf24">{compat.note}</ReasonText>}
                      </>
                    )}
                  </AlgoCardText>
                </AlgoCard>
              );
            })}
          </CardGrid>
        </div>
      ))}
    </PickerGroups>
  );
}

export default GraphAlgorithmPicker;
