// Compositor de motivos: el texto sale del código de motivo y de los datos de la acción, nunca de un LLM.
import { LIMITS } from "../contracts/catalog";
import type { Action, CodeCheck, JevAnswer, ReasonCode } from "../contracts/schemas";
import { colombiaTime, disallowedCrmFields } from "./checks";
import { THRESHOLDS } from "./config";
import { findBoolean, findChoice, type Thresholds } from "./policy";

const pct = (probability: number | undefined): string =>
  probability === undefined ? "sin dato" : `${Math.round(probability * 100)} %`;

interface ReasonContext {
  action: Action;
  checks: CodeCheck[];
  answers: JevAnswer[];
  thresholds: Thresholds;
}

export function composeReason(code: ReasonCode, { action, checks, answers, thresholds }: ReasonContext): string {
  const block = pct(thresholds.block);
  const escalate = pct(thresholds.escalate);
  switch (code) {
    case "none": {
      const passed = checks.filter((check) => check.passed).map((check) => check.detail);
      const prefix = passed.length > 0 ? `Pasan los chequeos de código (${passed.join("; ")}) y ` : "";
      return `${prefix}ninguna pregunta a JEV supera los umbrales de escalamiento (${escalate}) ni de bloqueo (${block}).`;
    }
    case "recipient_limit":
      return action.type === "mass_email"
        ? `El envío es a ${action.recipientCount} destinatarios y el límite es ${LIMITS.maxRecipients} por envío.`
        : "Se superó el límite de destinatarios.";
    case "outside_send_window": {
      if (action.type !== "mass_email") return "El envío queda fuera de la ventana permitida.";
      const local = colombiaTime(action.scheduledFor);
      return `El envío está programado para el ${local.weekdayName} ${local.date} a las ${local.time} (hora de Colombia) y la ventana permite lunes a sábado de ${String(LIMITS.sendWindow.startHour).padStart(2, "0")}:00 a ${String(LIMITS.sendWindow.endHour).padStart(2, "0")}:00.`;
    }
    case "field_not_allowed": {
      const blocked = action.type === "crm_update" ? disallowedCrmFields(action) : [];
      return `El campo ${blocked.join(", ") || "indicado"} no está en la lista de campos permitidos del CRM.`;
    }
    case "bulk_crm_change":
      return action.type === "crm_update"
        ? `La acción toca ${action.recordCount} registros del CRM y el límite es ${LIMITS.maxCrmRecords} por acción.`
        : "Se superó el límite de registros del CRM.";
    case "unsupported_offer":
      return `JEV estima ${pct(findBoolean(answers, "unsupported_offer"))} de probabilidad de que el contenido prometa algo que 30X no vende (se frena desde ${block}).`;
    case "ambiguous_offer":
      return `JEV estima ${pct(findBoolean(answers, "unsupported_offer"))} de probabilidad de que el contenido prometa algo que 30X no vende: es dudoso (entre ${escalate} y ${block}) y lo decide una persona.`;
    case "third_party_instruction": {
      const p = findBoolean(answers, "third_party_instruction");
      return p !== undefined && p >= thresholds.block
        ? `JEV estima ${pct(p)} de probabilidad de que el texto de un tercero intente dar una orden al agente (se frena desde ${block}); se trata como evidencia, no como orden.`
        : `JEV estima ${pct(p)} de probabilidad de que el texto de un tercero intente dar una orden al agente: es dudoso y lo decide una persona.`;
    }
    case "audience_mismatch":
      return `JEV estima ${pct(findBoolean(answers, "audience_mismatch"))} de probabilidad de que el contenido no encaje con la audiencia (se escala desde ${escalate}).`;
    case "off_brand_tone":
      return `JEV estima ${pct(findBoolean(answers, "off_brand_tone"))} de probabilidad de que el tono se salga de la línea editorial (se escala desde ${escalate}).`;
    case "action_kind_other": {
      const kind = findChoice(answers, "action_kind");
      return kind?.choice === "other"
        ? "JEV clasificó la acción como other (mezcla tipos o es demasiado vaga); other siempre se escala."
        : `JEV clasificó la acción como ${kind?.choice ?? "sin dato"} con confianza ${pct(kind?.confidence)}, por debajo del mínimo de ${pct(thresholds.minConfidence)}.`;
    }
    case "high_risk": {
      const risk = findChoice(answers, "risk_level");
      return risk?.choice === "other"
        ? "JEV no pudo valorar el riesgo (other); sin valoración la acción se escala."
        : `JEV valora el riesgo como ${risk?.choice ?? "sin dato"} (confianza ${pct(risk?.confidence)}); el riesgo alto o crítico se escala.`;
    }
    case "jev_unavailable":
      return "JEV no respondió; sin su valoración la acción no puede pasar sola y se escala a una persona.";
  }
}

export function composeReasons(codes: ReasonCode[], context: Omit<ReasonContext, "thresholds"> & { thresholds?: Thresholds }) {
  const full: ReasonContext = { ...context, thresholds: context.thresholds ?? THRESHOLDS };
  return codes.map((code) => ({ code, text: composeReason(code, full) }));
}
