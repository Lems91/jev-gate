// Convierte el formulario "prueba tu acción" en una Action válida. Sin reloj real: la fecha la trae el formulario.
import { z } from "zod";
import { TIMEZONE_OFFSET } from "../contracts/catalog";
import { ActionSchema, type Action } from "../contracts/schemas";

// Límite de texto del demo público (el formulario y el servidor usan el mismo valor).
export const MAX_CUSTOM_TEXT_CHARS = 600;

export const CUSTOM_ACTION_TYPES = ["mass_email", "crm_update", "publish_content"] as const;

export const CustomActionInputSchema = z.object({
  type: z.enum(CUSTOM_ACTION_TYPES),
  // Destinatarios (correo) o registros del CRM; en publicaciones no se usa.
  count: z.number().int().min(1).max(1_000_000),
  // Valor de un campo datetime-local ("2026-10-20T10:00"), interpretado como hora de Colombia.
  scheduledLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Fecha y hora con formato AAAA-MM-DDThh:mm"),
  text: z
    .string()
    .trim()
    .min(1, "Escribe el texto de la acción")
    .max(MAX_CUSTOM_TEXT_CHARS, `El texto admite como máximo ${MAX_CUSTOM_TEXT_CHARS} caracteres`),
  // Marca que el texto lo escribió un tercero: viaja a JEV como evidencia, nunca como orden.
  fromThirdParty: z.boolean(),
});
export type CustomActionInput = z.infer<typeof CustomActionInputSchema>;

export const CUSTOM_ACTION_ID = "A-900";

export function buildCustomAction(input: CustomActionInput, proposedAt: string): Action {
  const scheduledFor = `${input.scheduledLocal}:00${TIMEZONE_OFFSET}`;
  const base = {
    id: CUSTOM_ACTION_ID,
    agent: "agente-demo",
    area: "tech" as const,
    proposedAt,
    thirdPartyText: input.fromThirdParty ? { source: "form_field" as const, text: input.text } : undefined,
  };
  const preview = input.text.length > 70 ? `${input.text.slice(0, 70)}…` : input.text;
  if (input.type === "mass_email") {
    return ActionSchema.parse({
      ...base,
      type: "mass_email",
      summary: `Enviar un correo masivo escrito en el formulario de prueba: "${preview}"`,
      audience: "Lista de contactos de 30X (audiencia no especificada)",
      recipientCount: input.count,
      subject: preview,
      body: input.text,
      scheduledFor,
    });
  }
  if (input.type === "crm_update") {
    return ActionSchema.parse({
      ...base,
      type: "crm_update",
      summary: `Cambiar el campo notes en el CRM con el texto del formulario de prueba: "${preview}"`,
      selector: "Registros indicados en el formulario de prueba",
      recordCount: input.count,
      changes: [{ field: "notes", newValue: input.text }],
    });
  }
  return ActionSchema.parse({
    ...base,
    type: "publish_content",
    summary: `Publicar en el blog el texto del formulario de prueba: "${preview}"`,
    channel: "blog",
    targetAudience: "Lectores del blog",
    copy: input.text,
    scheduledFor,
  });
}
