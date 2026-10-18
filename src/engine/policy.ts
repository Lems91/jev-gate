// Política PASA / FRENA / ESCALA. Función pura: recibe chequeos y respuestas de JEV, devuelve el veredicto
// y los códigos de motivo en orden de importancia. No escribe texto (eso es reasons.ts) ni llama a nadie.
import type { CodeCheck, JevAnswer, QuestionId, ReasonCode, Verdict } from "../contracts/schemas";
import { ESCALATING_RISK_LEVELS, THRESHOLDS } from "./config";

export type Thresholds = { block: number; escalate: number; minConfidence: number };

export interface PolicyOutcome {
  verdict: Verdict;
  // Primer elemento = motivo principal. Para PASA es ["none"].
  codes: ReasonCode[];
}

const CHECK_TO_REASON: Record<CodeCheck["id"], ReasonCode> = {
  recipient_limit: "recipient_limit",
  send_window: "outside_send_window",
  allowed_fields: "field_not_allowed",
  crm_batch_size: "bulk_crm_change",
};

// Un chequeo de código fallido frena sin consultar a JEV.
export function failedCheckCodes(checks: CodeCheck[]): ReasonCode[] {
  return checks.filter((check) => !check.passed).map((check) => CHECK_TO_REASON[check.id]);
}

export function findBoolean(answers: JevAnswer[], id: QuestionId): number | undefined {
  const answer = answers.find((candidate) => candidate.questionId === id);
  return answer?.kind === "boolean" ? answer.probability : undefined;
}

export function findChoice(answers: JevAnswer[], id: QuestionId): { choice: string; confidence: number | undefined } | undefined {
  const answer = answers.find((candidate) => candidate.questionId === id);
  if (answer?.kind !== "choice") return undefined;
  return { choice: answer.choice, confidence: answer.probabilities?.[answer.choice] };
}

// Sin distribución de probabilidad no hay confianza que medir: se trata como confianza baja.
function isLowConfidence(confidence: number | undefined, thresholds: Thresholds): boolean {
  return confidence === undefined || confidence < thresholds.minConfidence;
}

export function applyPolicy(answers: JevAnswer[], thresholds: Thresholds = THRESHOLDS): PolicyOutcome {
  const block: ReasonCode[] = [];
  const escalate: ReasonCode[] = [];

  // Preguntas de bloqueo: p >= block frena; entre escalate y block escala.
  const offer = findBoolean(answers, "unsupported_offer");
  if (offer !== undefined) {
    if (offer >= thresholds.block) block.push("unsupported_offer");
    else if (offer >= thresholds.escalate) escalate.push("ambiguous_offer");
  }
  const injection = findBoolean(answers, "third_party_instruction");
  if (injection !== undefined) {
    if (injection >= thresholds.block) block.push("third_party_instruction");
    else if (injection >= thresholds.escalate) escalate.push("third_party_instruction");
  }

  // Preguntas de escalamiento.
  const mismatch = findBoolean(answers, "audience_mismatch");
  if (mismatch !== undefined && mismatch >= thresholds.escalate) escalate.push("audience_mismatch");
  const tone = findBoolean(answers, "off_brand_tone");
  if (tone !== undefined && tone >= thresholds.escalate) escalate.push("off_brand_tone");

  // Clasificación: "other" siempre escala; con baja confianza también.
  const kind = findChoice(answers, "action_kind");
  if (kind && (kind.choice === "other" || isLowConfidence(kind.confidence, thresholds))) escalate.push("action_kind_other");

  // Riesgo: solo escalan el nivel alto, el crítico y "other". La confianza no se usa aquí: JEV reparte el
  // riesgo en cinco opciones y la elegida rara vez supera 50 %, así que exigirla escalaba acciones seguras.
  const risk = findChoice(answers, "risk_level");
  if (risk && (ESCALATING_RISK_LEVELS.includes(risk.choice) || risk.choice === "other")) {
    escalate.push("high_risk");
  }

  if (block.length > 0) return { verdict: "FRENA", codes: block };
  if (escalate.length > 0) return { verdict: "ESCALA", codes: escalate };
  return { verdict: "PASA", codes: ["none"] };
}
