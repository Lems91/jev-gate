// Utilidades compartidas por los tests del motor (no se usan en producción).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LabeledActionsSchema, type Action, type JevAnswer, type LabeledAction } from "../contracts/schemas";

type EmailAction = Extract<Action, { type: "mass_email" }>;
type CrmAction = Extract<Action, { type: "crm_update" }>;
type PublishAction = Extract<Action, { type: "publish_content" }>;

export function loadFixtures(): LabeledAction[] {
  const raw = JSON.parse(readFileSync(join(process.cwd(), "fixtures", "actions.json"), "utf8"));
  return LabeledActionsSchema.parse(raw);
}

export function emailAction(overrides: Partial<EmailAction> = {}): EmailAction {
  return {
    id: "A-900",
    type: "mass_email",
    agent: "agente-test",
    area: "comercial",
    proposedAt: "2026-10-19T08:00:00-05:00",
    summary: "Correo de prueba",
    audience: "Suscriptores",
    recipientCount: 100,
    subject: "Asunto",
    body: "Cuerpo",
    scheduledFor: "2026-10-20T10:00:00-05:00",
    ...overrides,
  };
}

export function crmAction(overrides: Partial<CrmAction> = {}): CrmAction {
  return {
    id: "A-901",
    type: "crm_update",
    agent: "agente-test",
    area: "comercial",
    proposedAt: "2026-10-19T08:00:00-05:00",
    summary: "Cambio de prueba",
    selector: "Contacto de prueba",
    recordCount: 1,
    changes: [{ field: "lead_status", newValue: "contactado" }],
    ...overrides,
  };
}

export function publishAction(overrides: Partial<PublishAction> = {}): PublishAction {
  return {
    id: "A-902",
    type: "publish_content",
    agent: "agente-media",
    area: "media",
    proposedAt: "2026-10-19T08:00:00-05:00",
    summary: "Publicación de prueba",
    channel: "blog",
    targetAudience: "Lectores",
    copy: "Texto",
    scheduledFor: "2026-10-20T10:00:00-05:00",
    ...overrides,
  };
}

type QuestionId = JevAnswer["questionId"];

export const bool = (questionId: QuestionId, probability: number): JevAnswer => ({ questionId, kind: "boolean", probability });

export const choice = (questionId: QuestionId, selected: string, confidence: number | undefined): JevAnswer => ({
  questionId,
  kind: "choice",
  choice: selected,
  probabilities: confidence === undefined ? undefined : { [selected]: confidence, other: 1 - confidence },
});

// Respuestas "limpias": todo en orden y con alta confianza.
export function cleanAnswers(): JevAnswer[] {
  return [
    bool("unsupported_offer", 0.05),
    bool("audience_mismatch", 0.05),
    bool("off_brand_tone", 0.05),
    choice("action_kind", "mass_email", 0.99),
    choice("risk_level", "low", 0.9),
  ];
}

// Reemplaza las respuestas limpias que coinciden con las dadas.
export function withAnswers(...overrides: JevAnswer[]): JevAnswer[] {
  const ids = new Set(overrides.map((answer) => answer.questionId));
  return [...cleanAnswers().filter((answer) => !ids.has(answer.questionId)), ...overrides];
}
