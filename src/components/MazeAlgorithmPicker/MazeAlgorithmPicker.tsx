import { MAZE_ALGORITHMS, MAZE_ALGORITHM_IDS } from "../../maze/algorithms/registry";
import { MAZE_ALGORITHM_COLORS } from "../../maze/algorithms/colors";
import type { MazeAlgorithmId, MazeAlgorithmKind } from "../../maze/algorithms/types";
import {
  PickerGroups,
  GroupTitle,
  AlgoCardGrid,
  AlgoCard,
  AlgoCardText,
  Tag,
  ParamsPanel,
  ParamsGrid,
  ParamField,
} from "./styles";

const GROUPS: { kind: MazeAlgorithmKind; title: string }[] = [
  { kind: "exact", title: "Exatos" },
  { kind: "heuristic", title: "Heurísticos" },
  { kind: "metaheuristic", title: "Metaheurísticas (estocásticas)" },
];

export type ParamInputs = Partial<Record<MazeAlgorithmId, Record<string, string>>>;
export type ParamErrors = Partial<Record<MazeAlgorithmId, Record<string, string>>>;

type Props = {
  selected: Record<MazeAlgorithmId, boolean>;
  onToggle: (id: MazeAlgorithmId, checked: boolean) => void;
  paramInputs: ParamInputs;
  paramErrors: ParamErrors;
  onParamChange: (id: MazeAlgorithmId, key: string, value: string) => void;
  disabled: boolean;
};

function MazeAlgorithmPicker({
  selected,
  onToggle,
  paramInputs,
  paramErrors,
  onParamChange,
  disabled,
}: Props) {
  const withParams = MAZE_ALGORITHM_IDS.filter(
    (id) => selected[id] && MAZE_ALGORITHMS[id].params.length > 0
  );

  return (
    <PickerGroups>
      {GROUPS.map((group) => (
        <div key={group.kind}>
          <GroupTitle>{group.title}</GroupTitle>
          <AlgoCardGrid>
            {MAZE_ALGORITHM_IDS.filter((id) => MAZE_ALGORITHMS[id].kind === group.kind).map((id) => {
              const a = MAZE_ALGORITHMS[id];
              return (
                <AlgoCard
                  key={id}
                  $selected={selected[id]}
                  $accent={MAZE_ALGORITHM_COLORS[id]}
                  $disabled={disabled}
                >
                  <input
                    type="checkbox"
                    checked={selected[id]}
                    disabled={disabled}
                    onChange={(e) => onToggle(id, e.target.checked)}
                  />
                  <AlgoCardText>
                    <strong>{a.label}</strong>
                    <span>{a.description}</span>
                    {a.guaranteesOptimal ? (
                      <Tag $color="#86efac">
                        Ótimo garantido{a.optimalityNote ? ` ${a.optimalityNote}` : ""}
                      </Tag>
                    ) : (
                      <Tag $color="#fbbf24">Sem garantia de ótimo</Tag>
                    )}
                  </AlgoCardText>
                </AlgoCard>
              );
            })}
          </AlgoCardGrid>
        </div>
      ))}

      {withParams.map((id) => {
        const a = MAZE_ALGORITHMS[id];
        const inputs = paramInputs[id] ?? {};
        const errors = paramErrors[id] ?? {};
        return (
          <ParamsPanel key={id} $accent={MAZE_ALGORITHM_COLORS[id]} disabled={disabled}>
            <legend>Parâmetros — {a.label}</legend>
            <ParamsGrid>
              {a.params.map((p) => (
                <ParamField key={p.key} $invalid={!!errors[p.key]}>
                  {p.label}
                  <input
                    type="number"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={inputs[p.key] ?? String(p.default)}
                    aria-invalid={!!errors[p.key]}
                    onChange={(e) => onParamChange(id, p.key, e.target.value)}
                  />
                  {errors[p.key] ? (
                    <small role="alert">{errors[p.key]}</small>
                  ) : (
                    <small>{p.help}</small>
                  )}
                </ParamField>
              ))}
            </ParamsGrid>
          </ParamsPanel>
        );
      })}
    </PickerGroups>
  );
}

export default MazeAlgorithmPicker;
