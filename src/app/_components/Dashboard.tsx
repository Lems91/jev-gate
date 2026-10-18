"use client";

import { useRef, useState } from "react";
import type { AuditEntry } from "@/contracts/schemas";
import { createAuditEntry, resolveAuditEntry } from "@/engine/audit";
import type { DashboardData } from "@/server/dashboard-data";
import { ActionList } from "./ActionList";
import { DecisionCard } from "./DecisionCard";
import { MetricsBar } from "./MetricsBar";
import { ReviewPanel } from "./ReviewPanel";
import { TryAction } from "./TryAction";
import type { EvaluateResponse, Proposal } from "./types";

const REVIEWER = "Revisor del demo";

export function Dashboard({ data }: { data: DashboardData }) {
  const [selectedKey, setSelectedKey] = useState("A-001");
  const [liveProposals, setLiveProposals] = useState<Proposal[]>([]);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  // Claves de propuestas que ya están en el registro (cada una se registra una sola vez).
  const [registeredKeys, setRegisteredKeys] = useState<ReadonlySet<string>>(new Set());
  const counter = useRef(0);
  const decisionRef = useRef<HTMLDivElement>(null);

  const recorded = (key: string): Proposal | null => {
    const action = data.actions.find((item) => item.id === key);
    return action ? { key, action, decision: data.decisions[key], origin: "recorded" } : null;
  };
  const selected = recorded(selectedKey) ?? liveProposals.find((item) => item.key === selectedKey) ?? null;

  function showDecision(key: string) {
    setSelectedKey(key);
    // En pantallas angostas la tarjeta queda debajo de la lista: se lleva a la vista.
    if (window.matchMedia("(max-width: 999px)").matches) decisionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function register(proposal: Proposal) {
    counter.current += 1;
    const entry = createAuditEntry(`AUD-${String(counter.current).padStart(3, "0")}`, proposal.action, proposal.decision, new Date());
    setEntries((current) => [...current, entry]);
    setRegisteredKeys((current) => new Set(current).add(proposal.key));
  }

  function onLiveResult({ action, decision }: EvaluateResponse) {
    const proposal: Proposal = { key: `live-${liveProposals.length + 1}`, action, decision, origin: "live" };
    setLiveProposals((current) => [...current, proposal]);
    register(proposal);
    showDecision(proposal.key);
  }

  function onResolve(entryId: string, approve: boolean, note: string) {
    setEntries((current) => current.map((entry) => (entry.id === entryId ? resolveAuditEntry(entry, approve, REVIEWER, note.trim(), new Date()) : entry)));
  }

  function onExport() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "registro-auditoria-jev-gate.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <header className="top">
        <h1>JEV Gate</h1>
        <p className="tagline">Un portero que decide PASA, FRENA o ESCALA para las acciones de agentes internos. Nada se ejecuta de verdad: solo decide y deja registro.</p>
      </header>
      <MetricsBar data={data} />
      <div className="layout">
        <div className="column">
          <ActionList actions={data.actions} featured={data.featured} selectedKey={selectedKey} onSelect={showDecision} />
          {liveProposals.length > 0 && (
            <section aria-labelledby="mine-title" className="panel">
              <h2 id="mine-title">Tus pruebas en vivo</h2>
              <ul className="action-list">
                {liveProposals.map((proposal) => (
                  <li key={proposal.key}>
                    <button type="button" className="action-button" aria-pressed={selectedKey === proposal.key} onClick={() => showDecision(proposal.key)}>
                      <span className="action-id">
                        {proposal.decision.verdict} · {proposal.action.id}
                      </span>
                      <span className="action-summary">{proposal.action.summary}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <div className="column" ref={decisionRef}>
          <DecisionCard proposal={selected} registered={selected ? registeredKeys.has(selected.key) : false} onPropose={register} />
          <TryAction onResult={onLiveResult} />
        </div>
        <div className="column">
          <ReviewPanel entries={entries} onResolve={onResolve} onExport={onExport} />
        </div>
      </div>
    </>
  );
}
