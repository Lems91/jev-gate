// Eval del portero contra los 48 fixtures etiquetados. La etiqueta del JSON es la verdad: si JEV discrepa,
// el eval lo reporta; nunca se cambia la etiqueta ni el umbral para que pase.
// Uso: npm run eval                 (replay: lee recordings/, sin red ni costo)
//      npm run eval:record          (llama a JEV y graba en recordings/)
//      npm run eval -- --mode=live  (llama a JEV sin grabar)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { EVAL_TARGETS, JEV_MODEL, JEV_PRICE_USD_PER_MILLION_INPUT_TOKENS, MAX_PARALLEL_CALLS, THRESHOLDS } from "../src/engine/config";
import { HoldoutActionsSchema, LabeledActionsSchema, type Action, type JevMode } from "../src/contracts/schemas";
import { decideMany } from "../src/engine/gate";
import { createJevClient, modeFromEnv } from "../src/engine/jev-client";
import { computeMetrics, projectDailyCost, type EvalMetrics, type EvalRow } from "../src/engine/metrics";

function parseMode(): JevMode {
  const arg = process.argv.find((value) => value.startsWith("--mode="));
  return modeFromEnv(arg ? arg.slice("--mode=".length) : process.env.JEV_MODE);
}

const ms = (value: number) => `${value.toFixed(1)} ms`;
const usd = (value: number) => `$${value.toFixed(6)}`;
const pct = (value: number) => `${(value * 100).toFixed(1)} %`;

function describeAnswers(row: EvalRow): string {
  const answers = row.decision.answers.map((answer) =>
    answer.kind === "boolean"
      ? `${answer.questionId}=${answer.probability.toFixed(3)}`
      : `${answer.questionId}=${answer.choice}${answer.probabilities ? ` (${(answer.probabilities[answer.choice] ?? 0).toFixed(3)})` : ""}`,
  );
  return answers.length > 0 ? answers.join(", ") : "ninguna (decidió el código)";
}

function renderMarkdown(mode: JevMode, metrics: EvalMetrics, rows: EvalRow[], errors: string[]): string {
  const lines: string[] = [];
  const mark = (ok: boolean) => (ok ? "cumple" : "NO CUMPLE");
  lines.push(`# Informe del eval — modo ${mode}`);
  lines.push("");
  lines.push(
    `Modelo: \`${JEV_MODEL}\` · ${metrics.total} acciones etiquetadas · umbrales: bloqueo ${THRESHOLDS.block}, escalamiento ${THRESHOLDS.escalate}, confianza mínima ${THRESHOLDS.minConfidence}.`,
  );
  if (mode === "replay") {
    lines.push("");
    lines.push(
      "> En modo replay la latencia y los tokens son los medidos en la corrida que grabó cada llamada a JEV (más el trabajo local de esta corrida); no se vuelve a llamar a JEV.",
    );
  }
  lines.push("");
  lines.push("## Resultado frente a los objetivos del PRD");
  lines.push("");
  lines.push("| Métrica | Valor | Objetivo | Estado |");
  lines.push("|---|---|---|---|");
  lines.push(`| Exactitud global | ${pct(metrics.accuracy)} (${metrics.correct}/${metrics.total}) | ≥ ${pct(EVAL_TARGETS.minAccuracy)} | ${mark(metrics.targets.accuracy)} |`);
  lines.push(
    `| Falsos permisos en críticas (etiquetadas FRENA) | ${metrics.criticalFalsePermits}/${metrics.criticalTotal} | ≤ ${EVAL_TARGETS.maxCriticalFalsePermits} | ${mark(metrics.targets.criticalFalsePermits)} |`,
  );
  lines.push(`| Autonomía en seguras (PASA solas) | ${pct(metrics.autonomy)} (${metrics.safePassed}/${metrics.safeTotal}) | ≥ ${pct(EVAL_TARGETS.minAutonomy)} | ${mark(metrics.targets.autonomy)} |`);
  lines.push("");
  lines.push(
    `Otros: falsos permisos totales (FRENA o ESCALA etiquetadas que PASAN) ${metrics.totalFalsePermits}; FRENA etiquetadas que se escalan ${metrics.blockedAsEscalated}; ESCALA etiquetadas que se frenan ${metrics.escalatedAsBlocked}; motivo principal correcto en ${metrics.triggerMatches}/${metrics.correct} de los veredictos correctos.`,
  );
  lines.push("");
  lines.push("## Matriz de confusión (filas = etiqueta, columnas = decisión)");
  lines.push("");
  lines.push("| Etiqueta \\ Decisión | PASA | ESCALA | FRENA |");
  lines.push("|---|---|---|---|");
  for (const expected of ["PASA", "ESCALA", "FRENA"] as const) {
    const row = metrics.confusion[expected];
    lines.push(`| ${expected} | ${row.PASA} | ${row.ESCALA} | ${row.FRENA} |`);
  }
  lines.push("");
  lines.push("## Latencia, tokens y costo");
  lines.push("");
  lines.push(`Llamadas a JEV: ${metrics.jevCalls} (una por acción); decididas solo por código: ${metrics.codeOnlyDecisions}.`);
  lines.push("");
  lines.push("| | p50 | p95 | media | máx |");
  lines.push("|---|---|---|---|---|");
  lines.push(`| Decisiones con JEV | ${ms(metrics.latencyJevMs.p50)} | ${ms(metrics.latencyJevMs.p95)} | ${ms(metrics.latencyJevMs.mean)} | ${ms(metrics.latencyJevMs.max)} |`);
  lines.push(`| Todas las decisiones | ${ms(metrics.latencyAllMs.p50)} | ${ms(metrics.latencyAllMs.p95)} | ${ms(metrics.latencyAllMs.mean)} | ${ms(metrics.latencyAllMs.max)} |`);
  lines.push("");
  lines.push(
    `Tokens de entrada: ${metrics.inputTokensTotal} en total, ${metrics.inputTokensPerJevCall.toFixed(1)} por llamada a JEV. Precio publicado: $${JEV_PRICE_USD_PER_MILLION_INPUT_TOKENS} por 1M de tokens de entrada, sin cargo de salida.`,
  );
  lines.push(`Costo estimado del eval: ${usd(metrics.costTotalUsd)} · por decisión ${usd(metrics.costPerDecisionUsd)} · por llamada a JEV ${usd(metrics.costPerJevCallUsd)}.`);
  lines.push("");
  lines.push("Proyección (escenarios, no datos de 30X; método del PRD con los tokens medios por decisión de este eval):");
  lines.push("");
  lines.push("| Decisiones por día | Costo por día |");
  lines.push("|---|---|");
  for (const perDay of [1_000, 10_000, 100_000]) lines.push(`| ${perDay.toLocaleString("es-CO")} | ${usd(projectDailyCost(perDay, metrics))} |`);
  lines.push("");

  const mismatches = rows.filter((row) => row.decision.verdict !== row.labeled.expected.verdict);
  lines.push(`## Discrepancias con la etiqueta (${mismatches.length})`);
  lines.push("");
  if (mismatches.length === 0) lines.push("Ninguna.");
  for (const row of mismatches) {
    const { action, expected } = row.labeled;
    lines.push(`### ${action.id} (${action.type}): etiqueta ${expected.verdict}/${expected.trigger}, decisión ${row.decision.verdict}/${row.decision.reasons[0].code}`);
    lines.push("");
    lines.push(`- Acción: ${action.summary}`);
    lines.push(`- Etiqueta: ${expected.reason}`);
    lines.push(`- Motivo del portero: ${row.decision.reasons.map((reason) => reason.text).join(" | ")}`);
    lines.push(`- Respuestas de JEV: ${describeAnswers(row)}`);
    lines.push("");
  }

  lines.push("## Detalle por acción");
  lines.push("");
  lines.push("| Acción | Tipo | Etiqueta | Decisión | Motivo principal | Latencia | Tokens |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const { labeled, decision } of rows) {
    const flag = decision.verdict === labeled.expected.verdict ? "" : " ✗";
    lines.push(
      `| ${labeled.action.id} | ${labeled.action.type} | ${labeled.expected.verdict}/${labeled.expected.trigger} | ${decision.verdict}${flag} | ${decision.reasons[0].code} | ${ms(decision.latencyMs)} | ${decision.inputTokens} |`,
    );
  }
  if (errors.length > 0) {
    lines.push("");
    lines.push("## Errores de JEV");
    lines.push("");
    for (const error of errors) lines.push(`- ${error}`);
  }
  lines.push("");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const mode = parseMode();
  // El set nuevo solo informa: no es una compuerta ni se usa para ajustar umbrales.
  const holdout = process.argv.includes("--set=holdout");
  if (mode !== "replay" && !process.env.AI_GATEWAY_API_KEY) {
    console.error("Falta AI_GATEWAY_API_KEY en .env.local (los modos live y record llaman a JEV).");
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(join(process.cwd(), "fixtures", holdout ? "holdout.json" : "actions.json"), "utf8"));
  const labeled = holdout ? HoldoutActionsSchema.parse(raw) : LabeledActionsSchema.parse(raw);

  const errors: string[] = [];
  const client = createJevClient({ mode });
  const decisions = await decideMany(
    labeled.map((item) => item.action),
    {
      client,
      onJevError: (action: Action, error: unknown) => errors.push(`${action.id}: ${error instanceof Error ? error.message : String(error)}`),
    },
    MAX_PARALLEL_CALLS,
  );
  const rows: EvalRow[] = labeled.map((item, index) => ({ labeled: item, decision: decisions[index] }));
  const metrics = computeMetrics(rows);

  const rendered = renderMarkdown(mode, metrics, rows, errors);
  const markdown = holdout ? rendered.replace("# Informe del eval — modo", "# Informe del eval del set nuevo (no usado para calibrar) — modo") : rendered;
  const reportsDir = join(process.cwd(), "reports");
  mkdirSync(reportsDir, { recursive: true });
  // Replay es reproducible: un solo informe "latest". Las corridas con JEV real se conservan con fecha.
  const stamp = mode === "replay" ? "latest" : new Date().toISOString().replace(/[:.]/g, "-");
  const base = join(reportsDir, `eval-${holdout ? "holdout-" : ""}${mode}-${stamp}`);
  writeFileSync(`${base}.md`, markdown, "utf8");
  const json = `${JSON.stringify({ set: holdout ? "holdout" : "development", mode, model: JEV_MODEL, thresholds: THRESHOLDS, metrics, errors, decisions }, null, 2)}\n`;
  writeFileSync(`${base}.json`, json, "utf8");
  // La pantalla lee la última medición del set nuevo hecha con JEV real (record o live), no una repetición en replay.
  if (holdout && mode !== "replay") writeFileSync(join(reportsDir, "holdout-latest.json"), json, "utf8");

  console.log(
    [
      `Eval (${mode}) — ${metrics.total} acciones`,
      `  Exactitud:            ${pct(metrics.accuracy)} (${metrics.correct}/${metrics.total})  objetivo ≥ ${pct(EVAL_TARGETS.minAccuracy)}`,
      `  Falsos permisos crít: ${metrics.criticalFalsePermits}/${metrics.criticalTotal}  objetivo ≤ ${EVAL_TARGETS.maxCriticalFalsePermits}`,
      `  Autonomía en seguras: ${pct(metrics.autonomy)} (${metrics.safePassed}/${metrics.safeTotal})  objetivo ≥ ${pct(EVAL_TARGETS.minAutonomy)}`,
      `  Latencia JEV:         p50 ${ms(metrics.latencyJevMs.p50)} · p95 ${ms(metrics.latencyJevMs.p95)}`,
      `  Tokens entrada:       ${metrics.inputTokensTotal} (${metrics.inputTokensPerJevCall.toFixed(1)} por llamada)`,
      `  Costo estimado:       ${usd(metrics.costTotalUsd)} (${usd(metrics.costPerDecisionUsd)} por decisión)`,
      `  Informe:              ${base}.md`,
    ].join("\n"),
  );

  if (errors.length > 0) {
    console.error(`\n${errors.length} acción(es) sin respuesta de JEV (se escalaron):`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  if (!metrics.passed && !holdout) {
    console.error("\nEl eval NO cumple los umbrales del PRD. Revisa las discrepancias en el informe; no se tocan etiquetas ni verificador.");
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error("El eval falló:", error instanceof Error ? error.message : error);
  process.exit(1);
});
