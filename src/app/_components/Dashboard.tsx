"use client";

import { useRef, useState } from "react";
import type { AuditEntry } from "@/contracts/schemas";
import { createAuditEntry, resolveAuditEntry } from "@/engine/audit";
import type { DashboardData } from "@/server/dashboard-data";
import { ActionList } from "./ActionList";
import { HowItWorks } from "./HowItWorks";
import { Hero } from "./Hero";
import { Scenarios } from "./Scenarios";
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
      <Hero />

      <section aria-labelledby="demo-title" className="section">
        <h2 id="demo-title" className="section-title">
          Demo en 4 escenarios
        </h2>
        <p className="section-lead">Elige un escenario para ver cómo decide el portero: primero el código, después JEV, al final el veredicto y su motivo.</p>
        <Scenarios featured={data.featured} actions={data.actions} decisions={data.decisions} selectedKey={selectedKey} onSelect={showDecision} />
        <div className="demo-grid">
          <div ref={decisionRef} className="demo-main">
            <DecisionCard proposal={selected} registered={selected ? registeredKeys.has(selected.key) : false} onPropose={register} />
          </div>
          <ActionList actions={data.actions} selectedKey={selectedKey} onSelect={showDecision} />
        </div>
      </section>

      <div className="section two-col">
        <TryAction onResult={onLiveResult} />
        {liveProposals.length > 0 && (
          <section aria-labelledby="mine-title" className="panel section-panel">
            <h3 id="mine-title" className="panel-title">
              Tus pruebas en vivo
            </h3>
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

      <div className="section">
        <ReviewPanel entries={entries} onResolve={onResolve} onExport={onExport} />
      </div>

      <div className="section accordions">
        <details className="accordion">
          <summary>Resultados</summary>
          <MetricsBar data={data} />
        </details>
        <details className="accordion">
          <summary>Cómo funciona</summary>
          <HowItWorks />
        </details>
      </div>

      <footer className="footer">JEV Gate · prototipo con datos sintéticos · solo decide y registra, nunca ejecuta</footer>
    </>
  );
}
