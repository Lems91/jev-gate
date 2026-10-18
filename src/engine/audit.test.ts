import { describe, expect, it } from "vitest";
import fixtures from "../../fixtures/actions.json";
import { LabeledActionsSchema } from "../contracts/schemas";
import { colombiaIso, createAuditEntry, resolveAuditEntry } from "./audit";
import { decideAction } from "./gate";
import { createJevClient } from "./jev-client";

const action = LabeledActionsSchema.parse(fixtures)[0].action;
const NOW = new Date("2026-10-18T15:00:00Z");

describe("auditoría", () => {
  it("escribe la hora en Colombia", () => {
    expect(colombiaIso(NOW)).toBe("2026-10-18T10:00:00-05:00");
  });

  it("PASA queda auto_passed, FRENA auto_blocked y ESCALA pendiente", async () => {
    const decision = await decideAction(action, { client: createJevClient({ mode: "replay" }) });
    expect(decision.verdict).toBe("PASA");
    expect(createAuditEntry("e1", action, decision, NOW).status).toBe("auto_passed");
    expect(createAuditEntry("e2", action, { ...decision, verdict: "FRENA" }, NOW).status).toBe("auto_blocked");
    expect(createAuditEntry("e3", action, { ...decision, verdict: "ESCALA" }, NOW).status).toBe("pending_review");
  });

  it("solo se resuelven las entradas pendientes y queda quién y cuándo", async () => {
    const decision = await decideAction(action, { client: createJevClient({ mode: "replay" }) });
    const pending = createAuditEntry("e3", action, { ...decision, verdict: "ESCALA" }, NOW);
    const approved = resolveAuditEntry(pending, true, "Revisor demo", "ok", NOW);
    expect(approved).toMatchObject({ status: "approved", review: { reviewer: "Revisor demo", note: "ok" } });
    expect(resolveAuditEntry(pending, false, "Revisor demo", "", NOW).status).toBe("rejected");
    expect(() => resolveAuditEntry(approved, false, "Revisor demo", "", NOW)).toThrow();
  });
});
