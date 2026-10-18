"use client";

import { useState } from "react";
import type { Action } from "@/contracts/schemas";
import { ACTION_TYPE_LABEL } from "./format";

interface Props {
  actions: Action[];
  featured: { id: string; title: string }[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

export function ActionList({ actions, featured, selectedKey, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? actions.filter((action) => `${action.id} ${ACTION_TYPE_LABEL[action.type]} ${action.agent} ${action.summary}`.toLowerCase().includes(needle))
    : actions;
  const byId = new Map(actions.map((action) => [action.id, action]));

  return (
    <section aria-labelledby="list-title" className="panel">
      <h2 id="list-title">Acciones propuestas por agentes</h2>
      <p className="hint">Elige una acción para ver la decisión del portero.</p>

      <h3 className="subtitle">Escenarios destacados</h3>
      <ul className="featured" aria-label="Escenarios destacados">
        {featured.map((item) => {
          const action = byId.get(item.id);
          return (
            <li key={item.id}>
              <button type="button" className="featured-button" aria-pressed={selectedKey === item.id} onClick={() => onSelect(item.id)}>
                <span className="featured-title">{item.title}</span>
                <span className="featured-meta">
                  {item.id} · {action ? ACTION_TYPE_LABEL[action.type] : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <h3 className="subtitle">Las {actions.length} acciones</h3>
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
