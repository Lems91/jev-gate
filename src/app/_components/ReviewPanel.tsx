"use client";

import { useState } from "react";
import type { AuditEntry } from "@/contracts/schemas";
import { ACTION_TYPE_LABEL, shortDateTime, STATUS_LABEL, VERDICT_LABEL } from "./format";

interface Props {
  entries: AuditEntry[];
  onResolve: (entryId: string, approve: boolean, note: string) => void;
  onExport: () => void;
}

export function ReviewPanel({ entries, onResolve, onExport }: Props) {
  const [note, setNote] = useState("");
  const pending = entries.filter((entry) => entry.status === "pending_review");
  const newestFirst = [...entries].reverse();

  return (
    <section aria-labelledby="review-title" className="panel section-panel">
      <h2 id="review-title" className="section-title">Cola de revisión y auditoría</h2>
      <p className="hint">Las acciones que el portero escala esperan aquí. Aprobar o rechazar solo deja constancia: nada se ejecuta.</p>

      <label htmlFor="review-note" className="field-label">
        Nota para el registro (opcional)
      </label>
      <input id="review-note" className="input" value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} />

      <h3 className="subtitle">Cola de revisión ({pending.length})</h3>
      {pending.length === 0 ? (
        <p className="hint" data-testid="queue-empty">
          No hay acciones pendientes.
        </p>
      ) : (
        <ul className="queue" data-testid="queue">
          {pending.map((entry) => (
            <li key={entry.id} className="queue-item">
              <p className="queue-title">
                {entry.action.id} · {ACTION_TYPE_LABEL[entry.action.type]}
              </p>
              <p className="action-summary">{entry.action.summary}</p>
              <p className="hint">{entry.decision.reasons[0].text}</p>
              <div className="button-row">
                <button type="button" className="button button-approve" onClick={() => onResolve(entry.id, true, note)}>
                  Aprobar
                </button>
                <button type="button" className="button button-reject" onClick={() => onResolve(entry.id, false, note)}>
                  Rechazar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="log-header">
        <h3 className="subtitle">Registro de auditoría ({entries.length})</h3>
        <button type="button" className="button" disabled={entries.length === 0} onClick={onExport}>
          Exportar JSON
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="hint">Aún no hay entradas. Propón una acción para que quede registrada.</p>
      ) : (
        <ol className="log" data-testid="audit-log">
          {newestFirst.map((entry) => (
            <li key={entry.id} className="log-item">
              <p className="log-line">
                <strong>{entry.action.id}</strong> · {VERDICT_LABEL[entry.decision.verdict]} · <span data-testid="audit-status">{STATUS_LABEL[entry.status]}</span>
              </p>
              <p className="hint">
                {shortDateTime(entry.createdAt)} · {entry.decision.mode === "live" ? "en vivo" : "grabada"}
                {entry.review ? ` · ${entry.review.reviewer} resolvió ${shortDateTime(entry.review.resolvedAt)}${entry.review.note ? `: ${entry.review.note}` : ""}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
      <p className="hint">El registro vive en la memoria de este navegador; al recargar se pierde. Expórtalo si quieres conservarlo.</p>
    </section>
  );
}
