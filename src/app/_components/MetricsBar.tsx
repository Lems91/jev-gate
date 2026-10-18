import type { DashboardData } from "@/server/dashboard-data";
import { dollars, millis, percent } from "./format";

export function MetricsBar({ data }: { data: DashboardData }) {
  const { metrics, thresholds } = data;
  const tiles = [
    { label: "Exactitud del veredicto", value: percent(metrics.accuracy, 1), detail: `${metrics.correct} de ${metrics.total} acciones` },
    {
      label: "Falsos permisos en acciones críticas",
      value: `${metrics.criticalFalsePermits} de ${metrics.criticalTotal}`,
      detail: "etiquetadas FRENA que terminaron en PASA",
    },
    { label: "Autonomía en acciones seguras", value: percent(metrics.autonomy, 1), detail: `${metrics.safePassed} de ${metrics.safeTotal} pasaron solas` },
    {
      label: "Latencia de JEV (p50 / p95)",
      value: `${millis(metrics.latencyJevMs.p50)} / ${millis(metrics.latencyJevMs.p95)}`,
      detail: `${metrics.jevCalls} llamadas a JEV`,
    },
    { label: "Costo por decisión", value: dollars(metrics.costPerDecisionUsd), detail: `${metrics.inputTokensTotal} tokens de entrada en total` },
  ];
  return (
    <section aria-labelledby="metrics-title" className="metrics">
      <h2 id="metrics-title" className="visually-hidden">
        Métricas del eval
      </h2>
      <ul className="metric-tiles">
        {tiles.map((tile) => (
          <li key={tile.label} className="metric-tile">
            <span className="metric-label">{tile.label}</span>
            <strong className="metric-value">{tile.value}</strong>
            <span className="metric-detail">{tile.detail}</span>
          </li>
        ))}
      </ul>
      <p className="metrics-note">
        <strong>Calibrado sobre el set de desarrollo de 48 acciones:</strong> estas cifras no demuestran cómo se comportará con acciones nuevas. Fuente:{" "}
        <code>reports/eval-replay-latest.json</code> (eval en modo {data.reportMode} sobre grabaciones de llamadas reales a <code>{data.model}</code>; umbrales de bloqueo{" "}
        {percent(thresholds.block)} y de escalamiento {percent(thresholds.escalate)}).
      </p>
    </section>
  );
}
