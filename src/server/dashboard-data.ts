// Datos que la pantalla necesita, leídos de fixtures/ y reports/ en el servidor. No se calcula nada nuevo:
// las decisiones y las métricas son las del eval (modo replay sobre grabaciones de llamadas reales a JEV).
import fixtures from "../../fixtures/actions.json";
import holdoutReport from "../../reports/holdout-latest.json";
import report from "../../reports/eval-replay-latest.json";
import { z } from "zod";
import { DecisionSchema, LabeledActionsSchema, type Action, type Decision } from "../contracts/schemas";
import type { EvalMetrics } from "../engine/metrics";

// Escenarios destacados (ids de fixtures cuya decisión del eval coincide con la etiqueta).
const FEATURED = [
  { id: "A-001", title: "Acción segura" },
  { id: "A-009", title: "Oferta fuera del catálogo" },
  { id: "A-018", title: "Cambio masivo de CRM" },
  { id: "A-045", title: "Instrucción escondida de un tercero" },
] as const;

export interface DashboardData {
  actions: Action[];
  decisions: Record<string, Decision>;
  featured: { id: string; title: string }[];
  metrics: EvalMetrics;
  // Medición única del set nuevo (no usado para calibrar), hecha con JEV real.
  holdout: { metrics: EvalMetrics; mode: string; model: string };
  thresholds: { block: number; escalate: number; minConfidence: number };
  model: string;
  reportMode: string;
}

export function loadDashboardData(): DashboardData {
  const actions = LabeledActionsSchema.parse(fixtures).map((item) => item.action);
  const decisions = z.array(DecisionSchema).parse(report.decisions);
  const byId = Object.fromEntries(decisions.map((decision) => [decision.actionId, decision]));
  for (const action of actions) {
    if (!byId[action.id]) throw new Error(`El informe del eval no trae la decisión de ${action.id}`);
  }
  for (const item of FEATURED) {
    if (!actions.some((action) => action.id === item.id)) throw new Error(`El escenario destacado ${item.id} no existe en los fixtures`);
  }
  return {
    actions,
    decisions: byId,
    featured: FEATURED.map((item) => ({ ...item })),
    metrics: report.metrics as unknown as EvalMetrics,
    holdout: { metrics: holdoutReport.metrics as unknown as EvalMetrics, mode: holdoutReport.mode, model: holdoutReport.model },
    thresholds: report.thresholds,
    model: report.model,
    reportMode: report.mode,
  };
}
