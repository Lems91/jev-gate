import { describe, expect, it } from "vitest";
import { runCodeChecks } from "./checks";
import { buildCustomAction, CustomActionInputSchema, MAX_CUSTOM_TEXT_CHARS } from "./custom-action";

const base = { type: "mass_email", count: 100, scheduledLocal: "2026-10-20T10:00", text: "Hola, te invitamos a un webinar.", fromThirdParty: false } as const;
const PROPOSED = "2026-10-18T09:00:00-05:00";

describe("buildCustomAction", () => {
  it("arma un correo masivo con la fecha en hora de Colombia", () => {
    const action = buildCustomAction(base, PROPOSED);
    expect(action).toMatchObject({ type: "mass_email", recipientCount: 100, scheduledFor: "2026-10-20T10:00:00-05:00" });
    expect(runCodeChecks(action).every((check) => check.passed)).toBe(true);
  });

  it("un domingo queda fuera de la ventana de envío", () => {
    const action = buildCustomAction({ ...base, scheduledLocal: "2026-10-18T10:00" }, PROPOSED);
    expect(runCodeChecks(action).find((check) => check.id === "send_window")?.passed).toBe(false);
  });

  it("marca el texto de terceros solo si se pidió", () => {
    expect(buildCustomAction(base, PROPOSED).thirdPartyText).toBeUndefined();
    const withThird = buildCustomAction({ ...base, fromThirdParty: true }, PROPOSED);
    expect(withThird.thirdPartyText).toEqual({ source: "form_field", text: base.text });
  });

  it("arma cambio de CRM y publicación", () => {
    expect(buildCustomAction({ ...base, type: "crm_update", count: 25 }, PROPOSED)).toMatchObject({ type: "crm_update", recordCount: 25 });
    expect(buildCustomAction({ ...base, type: "publish_content" }, PROPOSED)).toMatchObject({ type: "publish_content", channel: "blog" });
  });
});

describe("CustomActionInputSchema", () => {
  it("rechaza texto de más de 600 caracteres y texto vacío", () => {
    expect(CustomActionInputSchema.safeParse({ ...base, text: "a".repeat(MAX_CUSTOM_TEXT_CHARS) }).success).toBe(true);
    expect(CustomActionInputSchema.safeParse({ ...base, text: "a".repeat(MAX_CUSTOM_TEXT_CHARS + 1) }).success).toBe(false);
    expect(CustomActionInputSchema.safeParse({ ...base, text: "   " }).success).toBe(false);
  });

  it("rechaza conteos inválidos y fechas mal formadas", () => {
    expect(CustomActionInputSchema.safeParse({ ...base, count: 0 }).success).toBe(false);
    expect(CustomActionInputSchema.safeParse({ ...base, count: 1.5 }).success).toBe(false);
    expect(CustomActionInputSchema.safeParse({ ...base, scheduledLocal: "mañana" }).success).toBe(false);
  });
});
