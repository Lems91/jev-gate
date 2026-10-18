import type { Action, Decision } from "@/contracts/schemas";
import { ACTION_TYPE_LABEL, VERDICT_GLYPH } from "./format";

interface Props {
  featured: { id: string; title: string }[];
  actions: Action[];
  decisions: Record<string, Decision>;
  selectedKey: string;
  onSelect: (key: string) => void;
}

export function Scenarios({ featured, actions, decisions, selectedKey, onSelect }: Props) {
  const byId = new Map(actions.map((action) => [action.id, action]));
  return (
    <ul className="scenarios" aria-label="Escenarios de la demo">
      {featured.map((item) => {
        const action = byId.get(item.id);
        const verdict = decisions[item.id].verdict;
        return (
          <li key={item.id}>
            <button type="button" className={`scenario verdict-${verdict}`} aria-pressed={selectedKey === item.id} onClick={() => onSelect(item.id)}>
              <span className="scenario-verdict">
                <span aria-hidden="true">{VERDICT_GLYPH[verdict]}</span> {verdict}
              </span>
              <span className="scenario-title">{item.title}</span>
              <span className="scenario-meta">
                {item.id} · {action ? ACTION_TYPE_LABEL[action.type] : ""}
              </span>
              <span className="scenario-summary">{action?.summary}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
