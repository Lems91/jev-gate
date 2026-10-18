"use client";

import { useState } from "react";
import type { Action } from "@/contracts/schemas";
import { ACTION_TYPE_LABEL } from "./format";

interface Props {
  actions: Action[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

export function ActionList({ actions, selectedKey, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? actions.filter((action) => `${action.id} ${ACTION_TYPE_LABEL[action.type]} ${action.agent} ${action.summary}`.toLowerCase().includes(needle))
    : actions;

  return (
    <section aria-labelledby="list-title" className="panel">
      <h3 id="list-title" className="panel-title">Todas las acciones</h3>
      <p className="hint">Propuestas por agentes. Elige una para ver la decisión del portero.</p>

      <label htmlFor="search" className="field-label">
        Buscar por id, tipo, agente o texto
      </label>
      <input id="search" type="search" className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. A-002, CRM, webinar" />
      <p className="hint" aria-live="polite">
        {visible.length} de {actions.length} acciones
      </p>
      <ul className="action-list">
        {visible.map((action) => (
          <li key={action.id}>
            <button type="button" className="action-button" aria-pressed={selectedKey === action.id} onClick={() => onSelect(action.id)}>
              <span className="action-id">
                {action.id} · {ACTION_TYPE_LABEL[action.type]}
              </span>
              <span className="action-summary">{action.summary}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
