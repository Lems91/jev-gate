// Formato de números y textos para mostrar. Solo presentación: ninguna decisión se toma aquí.
import type { Action, QuestionId, Verdict } from "@/contracts/schemas";

export const percent = (value: number, digits = 0) => `${(value * 100).toFixed(digits)} %`;
export const millis = (value: number) => `${value.toFixed(0)} ms`;
export const dollars = (value: number) => `$${value.toFixed(6)}`;

export const ACTION_TYPE_LABEL: Record<Action["type"], string> = {
  mass_email: "Correo masivo",
  crm_update: "Cambio en el CRM",
  publish_content: "Publicación",
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  PASA: "PASA",
  FRENA: "FRENA",
  ESCALA: "ESCALA",
};

export const VERDICT_HINT: Record<Verdict, string> = {
  PASA: "Puede seguir sola",
  FRENA: "Bloqueada",
  ESCALA: "Va a una persona",
};

export const QUESTION_LABEL: Record<QuestionId, string> = {
  unsupported_offer: "¿Promete algo que 30X no vende?",
  audience_mismatch: "¿No encaja con la audiencia?",
  off_brand_tone: "¿El tono es agresivo o irrespetuoso?",
  third_party_instruction: "¿Un tercero le da una orden al agente?",
  action_kind: "Tipo de acción según JEV",
  risk_level: "Riesgo según JEV",
};

export const CHOICE_LABEL: Record<string, string> = {
  mass_email: "correo masivo",
  crm_update: "cambio en el CRM",
  publish_content: "publicación",
  low: "bajo",
  medium: "medio",
  high: "alto",
  critical: "crítico",
  other: "otro / no se puede juzgar",
};

export const STATUS_LABEL = {
  auto_passed: "Pasó sola",
  auto_blocked: "Frenada",
  pending_review: "Pendiente de revisión",
  approved: "Aprobada por una persona",
  rejected: "Rechazada por una persona",
} as const;

export const CHECK_LABEL = {
  recipient_limit: "Límite de destinatarios",
  send_window: "Ventana de envío",
  allowed_fields: "Campos permitidos del CRM",
  crm_batch_size: "Registros del CRM por acción",
} as const;

// "2026-10-18T10:00:00-05:00" -> "2026-10-18 10:00"
export const shortDateTime = (iso: string) => iso.slice(0, 16).replace("T", " ");
