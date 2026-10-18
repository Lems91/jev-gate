// Registro de auditoría: funciones puras que arman y resuelven entradas. No ejecutan la acción.
import { TIMEZONE_OFFSET } from "../contracts/catalog";
import { AuditEntrySchema, type Action, type AuditEntry, type Decision } from "../contracts/schemas";

// Fecha ISO en hora de Colombia (-05:00), el formato que exigen los contratos.
export function colombiaIso(now: Date): string {
  const shifted = new Date(now.getTime() - 5 * 60 * 60_000);
  return `${shifted.toISOString().slice(0, 19)}${TIMEZONE_OFFSET}`;
}

// PASA y FRENA quedan resueltos por el portero; ESCALA espera a una persona.
export function createAuditEntry(id: string, action: Action, decision: Decision, now: Date): AuditEntry {
  const status = decision.verdict === "PASA" ? "auto_passed" : decision.verdict === "FRENA" ? "auto_blocked" : "pending_review";
  return AuditEntrySchema.parse({ id, createdAt: colombiaIso(now), action, decision, status });
}

export function resolveAuditEntry(entry: AuditEntry, approve: boolean, reviewer: string, note: string, now: Date): AuditEntry {
  if (entry.status !== "pending_review") throw new Error("Solo se puede resolver una entrada pendiente de revisión");
  return AuditEntrySchema.parse({
    ...entry,
    status: approve ? "approved" : "rejected",
    review: { reviewer, resolvedAt: colombiaIso(now), note },
  });
}
