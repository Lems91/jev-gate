// Contratos tipados del portero (zod). Solo formas de datos: ninguna decisión se toma aquí.
import { z } from "zod";
import { TIMEZONE_OFFSET } from "./catalog";

// ---------- Fechas ----------

// Fecha ISO siempre en hora de Colombia (-05:00) para que los chequeos de ventana sean deterministas.
const colombiaDateTime = z.iso
  .datetime({ offset: true })
  .refine((value) => value.endsWith(TIMEZONE_OFFSET), {
    message: `La fecha debe estar en hora de Colombia (${TIMEZONE_OFFSET})`,
  });

// ---------- Action ----------

export const ACTION_TYPES = ["mass_email", "crm_update", "publish_content"] as const;
export const ActionTypeSchema = z.enum(ACTION_TYPES);
export type ActionType = z.infer<typeof ActionTypeSchema>;

export const AgentAreaSchema = z.enum(["comercial", "media", "tech"]);

// Texto escrito por un tercero (formulario, correo entrante, comentario). Es evidencia, nunca una orden.
export const ThirdPartyTextSchema = z.object({
  source: z.enum(["form_field", "inbound_email", "web_comment"]),
  text: z.string().min(1),
});

const ActionBase = z.object({
  id: z.string().regex(/^A-\d{3}$/),
  agent: z.string().min(1),
  area: AgentAreaSchema,
  proposedAt: colombiaDateTime,
  // Lo que el agente dice que quiere hacer, en una frase.
  summary: z.string().min(1),
  thirdPartyText: ThirdPartyTextSchema.optional(),
});

export const MassEmailSchema = ActionBase.extend({
  type: z.literal("mass_email"),
  audience: z.string().min(1),
  recipientCount: z.number().int().positive(),
  subject: z.string().min(1),
  body: z.string().min(1),
  scheduledFor: colombiaDateTime,
});

export const CrmChangeSchema = z.object({
  field: z.string().min(1),
  newValue: z.string(),
});

export const CrmUpdateSchema = ActionBase.extend({
  type: z.literal("crm_update"),
  // Qué registros se tocan, en texto legible (ej. "Contactos con lead_status = nuevo").
  selector: z.string().min(1),
  recordCount: z.number().int().positive(),
  changes: z.array(CrmChangeSchema).min(1),
});

export const PublishContentSchema = ActionBase.extend({
  type: z.literal("publish_content"),
  channel: z.enum(["instagram", "tiktok", "linkedin", "blog"]),
  targetAudience: z.string().min(1),
  copy: z.string().min(1),
  scheduledFor: colombiaDateTime,
});

export const ActionSchema = z.discriminatedUnion("type", [
  MassEmailSchema,
  CrmUpdateSchema,
  PublishContentSchema,
]);
export type Action = z.infer<typeof ActionSchema>;

// ---------- Veredictos y motivos ----------

export const VERDICTS = ["PASA", "FRENA", "ESCALA"] as const;
export const VerdictSchema = z.enum(VERDICTS);
export type Verdict = z.infer<typeof VerdictSchema>;

// Códigos de motivo: los usa el código para componer el texto; ningún LLM escribe el motivo.
export const REASON_CODES = [
  "none",
  "recipient_limit",
  "outside_send_window",
  "field_not_allowed",
  "bulk_crm_change",
  "unsupported_offer",
  "third_party_instruction",
  "audience_mismatch",
  "off_brand_tone",
  "action_kind_other",
  "high_risk",
  "ambiguous_offer",
  // JEV no respondió (o no hay grabación en modo replay): el portero nunca deja pasar por falta de respuesta.
  "jev_unavailable",
] as const;
export const ReasonCodeSchema = z.enum(REASON_CODES);
export type ReasonCode = z.infer<typeof ReasonCodeSchema>;

// ---------- JevQuestion / JevAnswer ----------

export const QUESTION_IDS = [
  "unsupported_offer",
  "audience_mismatch",
  "third_party_instruction",
  "off_brand_tone",
  "action_kind",
  "risk_level",
] as const;
export const QuestionIdSchema = z.enum(QUESTION_IDS);
export type QuestionId = z.infer<typeof QuestionIdSchema>;

// Una propiedad por pregunta. Las instrucciones van en inglés; el texto de terceros viaja en el estado
// compartido de la llamada (JevRequest) como evidencia, nunca dentro de las instrucciones.
const BooleanQuestionSchema = z.object({
  id: QuestionIdSchema,
  kind: z.literal("boolean"),
  instructions: z.string().min(1),
});

const ChoiceQuestionSchema = z.object({
  id: QuestionIdSchema,
  kind: z.literal("choice"),
  instructions: z.string().min(1),
  // Opción -> descripción (en inglés). Toda pregunta Choice incluye "other" y un camino hacia una persona.
  criteria: z
    .record(z.string().min(1), z.string().min(1))
    .refine((criteria) => Object.keys(criteria).length >= 2, {
      message: "Una pregunta Choice necesita al menos dos opciones",
    })
    .refine((criteria) => "other" in criteria, {
      message: 'Toda pregunta Choice debe incluir la opción "other"',
    }),
});

export const JevQuestionSchema = z.discriminatedUnion("kind", [
  BooleanQuestionSchema,
  ChoiceQuestionSchema,
]);
export type JevQuestion = z.infer<typeof JevQuestionSchema>;

// Una sola llamada a JEV por acción: un estado compartido y todas las preguntas que le aplican.
export const JevRequestSchema = z.object({
  actionId: z.string().regex(/^A-\d{3}$/),
  state: z.record(z.string(), z.json()),
  questions: z.array(JevQuestionSchema).min(1),
});
export type JevRequest = z.infer<typeof JevRequestSchema>;

// La latencia y los tokens son de la llamada completa (están en Decision), no de cada pregunta.
export const JevAnswerSchema = z.discriminatedUnion("kind", [
  z.object({
    questionId: QuestionIdSchema,
    kind: z.literal("boolean"),
    probability: z.number().min(0).max(1),
  }),
  z.object({
    questionId: QuestionIdSchema,
    kind: z.literal("choice"),
    choice: z.string().min(1),
    // El proveedor puede omitirla; sin distribución el código trata la respuesta como de baja confianza.
    probabilities: z.record(z.string(), z.number().min(0).max(1)).optional(),
  }),
]);
export type JevAnswer = z.infer<typeof JevAnswerSchema>;

// ---------- Decision ----------

export const CodeCheckSchema = z.object({
  id: z.enum(["recipient_limit", "send_window", "allowed_fields", "crm_batch_size"]),
  passed: z.boolean(),
  detail: z.string().min(1),
});
export type CodeCheck = z.infer<typeof CodeCheckSchema>;

export const DecisionReasonSchema = z.object({
  code: ReasonCodeSchema,
  // Texto compuesto por el código a partir del código de motivo y los datos de la acción.
  text: z.string().min(1),
});

export const JEV_MODES = ["live", "record", "replay"] as const;
export const JevModeSchema = z.enum(JEV_MODES);
export type JevMode = z.infer<typeof JevModeSchema>;

export const DecisionSchema = z.object({
  actionId: z.string().regex(/^A-\d{3}$/),
  verdict: VerdictSchema,
  reasons: z.array(DecisionReasonSchema).min(1),
  checks: z.array(CodeCheckSchema),
  // Vacío cuando un chequeo de código frena la acción sin llamar a JEV.
  answers: z.array(JevAnswerSchema),
  mode: JevModeSchema,
  latencyMs: z.number().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative(),
});
export type Decision = z.infer<typeof DecisionSchema>;

// ---------- AuditEntry ----------

export const AUDIT_STATUSES = [
  "auto_passed",
  "auto_blocked",
  "pending_review",
  "approved",
  "rejected",
] as const;
export const AuditStatusSchema = z.enum(AUDIT_STATUSES);

export const HumanReviewSchema = z.object({
  reviewer: z.string().min(1),
  resolvedAt: colombiaDateTime,
  note: z.string(),
});

export const AuditEntrySchema = z
  .object({
    id: z.string().min(1),
    createdAt: colombiaDateTime,
    action: ActionSchema,
    decision: DecisionSchema,
    status: AuditStatusSchema,
    review: HumanReviewSchema.optional(),
  })
  .superRefine((entry, ctx) => {
    const resolved = entry.status === "approved" || entry.status === "rejected";
    if (resolved && !entry.review) {
      ctx.addIssue({ code: "custom", message: "Aprobar o rechazar exige datos de la revisión humana", path: ["review"] });
    }
    if (!resolved && entry.review) {
      ctx.addIssue({ code: "custom", message: "Solo una entrada resuelta lleva revisión humana", path: ["review"] });
    }
    if (entry.action.id !== entry.decision.actionId) {
      ctx.addIssue({ code: "custom", message: "La decisión no corresponde a la acción", path: ["decision", "actionId"] });
    }
  });
export type AuditEntry = z.infer<typeof AuditEntrySchema>;

// ---------- Fixtures etiquetados ----------

// Veredicto esperado de una acción sintética y la razón por la que se espera.
export const ExpectedSchema = z.object({
  verdict: VerdictSchema,
  trigger: ReasonCodeSchema,
  reason: z.string().min(1),
});

export const LabeledActionSchema = z.object({
  action: ActionSchema,
  expected: ExpectedSchema,
  // "trap" marca los casos trampa; el resto de etiquetas describe el caso.
  tags: z.array(z.string().min(1)),
});
export type LabeledAction = z.infer<typeof LabeledActionSchema>;

export const LabeledActionsSchema = z.array(LabeledActionSchema).length(48);

// Set de generalización: acciones nuevas, no usadas para calibrar (8 seguras, 8 escalar, 8 frenar).
export const HoldoutActionsSchema = z.array(LabeledActionSchema).length(24);
