"use client";

import { useState, type FormEvent } from "react";
import { CUSTOM_ACTION_TYPES, MAX_CUSTOM_TEXT_CHARS, type CustomActionInput } from "@/engine/custom-action";
import { LIVE_LIMITS } from "@/server/limits";
import { ACTION_TYPE_LABEL } from "./format";
import type { EvaluateResponse } from "./types";

interface Props {
  onResult: (result: EvaluateResponse) => void;
}

export function TryAction({ onResult }: Props) {
  const [type, setType] = useState<CustomActionInput["type"]>("mass_email");
  const [count, setCount] = useState("100");
  const [scheduledLocal, setScheduledLocal] = useState("2026-10-20T10:00");
  const [text, setText] = useState("");
  const [fromThirdParty, setFromThirdParty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const needsCount = type !== "publish_content";
  const countLabel = type === "mass_email" ? "Número de destinatarios" : "Número de registros del CRM";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const payload: CustomActionInput = { type, count: needsCount ? Number(count) : 1, scheduledLocal, text, fromThirdParty };
    try {
      const response = await fetch("/api/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body: unknown = await response.json();
      if (!response.ok) {
        const error = (body as { error?: string }).error;
        setMessage(error ?? "No se pudo evaluar la acción.");
        return;
      }
      onResult(body as EvaluateResponse);
    } catch {
      setMessage("No se pudo contactar al servidor. Las decisiones grabadas siguen disponibles.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="try-title" className="panel">
      <h2 id="try-title">Prueba tu acción</h2>
      <p className="hint">Se evalúa en vivo con JEV desde el servidor. Nada se ejecuta de verdad. Máximo {MAX_CUSTOM_TEXT_CHARS} caracteres y {LIVE_LIMITS.perIpPerHour} evaluaciones en vivo por hora.</p>
      <form onSubmit={submit} className="form">
        <label htmlFor="try-type" className="field-label">
          Tipo de acción
        </label>
        <select id="try-type" className="input" value={type} onChange={(event) => setType(event.target.value as CustomActionInput["type"])}>
          {CUSTOM_ACTION_TYPES.map((value) => (
            <option key={value} value={value}>
              {ACTION_TYPE_LABEL[value]}
            </option>
          ))}
        </select>

        <label htmlFor="try-count" className="field-label">
          {countLabel}
        </label>
        <input
          id="try-count"
          className="input"
          type="number"
          min={1}
          max={1000000}
          step={1}
          required={needsCount}
          disabled={!needsCount}
          value={needsCount ? count : ""}
          placeholder={needsCount ? undefined : "No aplica a publicaciones"}
          onChange={(event) => setCount(event.target.value)}
        />

        <label htmlFor="try-when" className="field-label">
          Fecha y hora programada (hora de Colombia)
        </label>
        <input id="try-when" className="input" type="datetime-local" required value={scheduledLocal} onChange={(event) => setScheduledLocal(event.target.value)} />
        {type === "crm_update" && <p className="hint">Un cambio en el CRM no tiene hora de envío; la fecha se guarda pero no se evalúa.</p>}

        <label htmlFor="try-text" className="field-label">
          Texto de la acción
        </label>
        <textarea id="try-text" className="input" rows={5} required maxLength={MAX_CUSTOM_TEXT_CHARS} value={text} onChange={(event) => setText(event.target.value)} />
        <p className="hint" aria-live="polite">
          {text.length} / {MAX_CUSTOM_TEXT_CHARS} caracteres
        </p>

        <label className="check-row">
          <input type="checkbox" checked={fromThirdParty} onChange={(event) => setFromThirdParty(event.target.checked)} />
          <span>El texto lo escribió un tercero (cliente, formulario, correo recibido)</span>
        </label>

        <button type="submit" className="button button-primary" disabled={busy}>
          {busy ? "Evaluando en vivo…" : "Evaluar en vivo"}
        </button>
        <p className="message" role="alert">
          {message}
        </p>
      </form>
    </section>
  );
}
