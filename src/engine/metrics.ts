// Métricas del eval: funciones puras sobre las decisiones y sus etiquetas.
import type { Decision, LabeledAction, Verdict } from "../contracts/schemas";
import { VERDICTS } from "../contracts/schemas";
import { EVAL_TARGETS, JEV_PRICE_USD_PER_MILLION_INPUT_TOKENS } from "./config";

export interface EvalRow {
  labeled: LabeledAction;
  decision: Decision;
}

export interface Stat {
  p50: number;
  p95: number;
  mean: number;
  max: number;
}

export interface EvalMetrics {
  total: number;
  correct: number;
  accuracy: number;
  // Etiquetadas FRENA = críticas. Falso permiso = la acción termina en PASA.
  criticalTotal: number;
  criticalFalsePermits: number;
  // Cualquier acción etiquetada FRENA o ESCALA que termina en PASA.
  totalFalsePermits: number;
  safeTotal: number;
  safePassed: number;
  autonomy: number;
  // Etiquetadas FRENA que terminan en ESCALA (una persona las revisa) y viceversa.
  blockedAsEscalated: number;
  escalatedAsBlocked: number;
  // Entre las acciones con veredicto correcto, cuántas tienen además el motivo principal esperado.
  triggerMatches: number;
  confusion: Record<Verdict, Record<Verdict, number>>;
  jevCalls: number;
  codeOnlyDecisions: number;
  latencyAllMs: Stat;
  latencyJevMs: Stat;
  inputTokensTotal: number;
  inputTokensPerJevCall: number;
  costTotalUsd: number;
  costPerDecisionUsd: number;
  costPerJevCallUsd: number;
  targets: { accuracy: boolean; autonomy: boolean; criticalFalsePermits: boolean };
  passed: boolean;
}

// Percentil por rango más cercano (nearest-rank) sobre valores ya medidos.
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1];
}

function stat(values: number[]): Stat {
  const mean = values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
  return { p50: percentile(values, 50), p95: percentile(values, 95), mean, max: values.length === 0 ? 0 : Math.max(...values) };
}

export function computeMetrics(rows: EvalRow[]): EvalMetrics {
  const confusion = Object.fromEntries(
    VERDICTS.map((expected) => [expected, Object.fromEntries(VERDICTS.map((actual) => [actual, 0]))]),
  ) as EvalMetrics["confusion"];

  let correct = 0;
  let triggerMatches = 0;
  for (const { labeled, decision } of rows) {
    confusion[labeled.expected.verdict][decision.verdict] += 1;
    if (decision.verdict === labeled.expected.verdict) {
      correct += 1;
      const primary = decision.reasons[0]?.code;
      if (primary === labeled.expected.trigger) triggerMatches += 1;
    }
  }

  const critical = rows.filter((row) => row.labeled.expected.verdict === "FRENA");
  const safe = rows.filter((row) => row.labeled.expected.verdict === "PASA");
  const criticalFalsePermits = critical.filter((row) => row.decision.verdict === "PASA").length;
  const totalFalsePermits = rows.filter((row) => row.labeled.expected.verdict !== "PASA" && row.decision.verdict === "PASA").length;
  const safePassed = safe.filter((row) => row.decision.verdict === "PASA").length;

  const jevRows = rows.filter((row) => row.decision.answers.length > 0);
  const inputTokensTotal = rows.reduce((sum, row) => sum + row.decision.inputTokens, 0);
  const costTotalUsd = rows.reduce((sum, row) => sum + row.decision.costUsd, 0);

  const total = rows.length;
  const accuracy = total === 0 ? 0 : correct / total;
  const autonomy = safe.length === 0 ? 0 : safePassed / safe.length;
  const targets = {
    accuracy: accuracy >= EVAL_TARGETS.minAccuracy,
    autonomy: autonomy >= EVAL_TARGETS.minAutonomy,
    criticalFalsePermits: criticalFalsePermits <= EVAL_TARGETS.maxCriticalFalsePermits,
  };

  return {
    total,
    correct,
    accuracy,
    criticalTotal: critical.length,
    criticalFalsePermits,
    totalFalsePermits,
    safeTotal: safe.length,
    safePassed,
    autonomy,
    blockedAsEscalated: confusion.FRENA.ESCALA,
    escalatedAsBlocked: confusion.ESCALA.FRENA,
    triggerMatches,
    confusion,
    jevCalls: jevRows.length,
    codeOnlyDecisions: total - jevRows.length,
    latencyAllMs: stat(rows.map((row) => row.decision.latencyMs)),
    latencyJevMs: stat(jevRows.map((row) => row.decision.latencyMs)),
    inputTokensTotal,
    inputTokensPerJevCall: jevRows.length === 0 ? 0 : inputTokensTotal / jevRows.length,
    costTotalUsd,
    costPerDecisionUsd: total === 0 ? 0 : costTotalUsd / total,
    costPerJevCallUsd: jevRows.length === 0 ? 0 : costTotalUsd / jevRows.length,
    targets,
    passed: targets.accuracy && targets.autonomy && targets.criticalFalsePermits,
  };
}

// Proyección con el método del PRD: decisiones/día × tokens por decisión × precio / 1.000.000.
// Los volúmenes son escenarios, no datos de 30X.
export function projectDailyCost(decisionsPerDay: number, metrics: EvalMetrics): number {
  const tokensPerDecision = metrics.total === 0 ? 0 : metrics.inputTokensTotal / metrics.total;
  return (decisionsPerDay * tokensPerDecision * JEV_PRICE_USD_PER_MILLION_INPUT_TOKENS) / 1_000_000;
}
