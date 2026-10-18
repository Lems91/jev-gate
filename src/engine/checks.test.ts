import { describe, expect, it } from "vitest";
import { colombiaTime, isInsideSendWindow, runCodeChecks } from "./checks";
import { failedCheckCodes } from "./policy";
import { crmAction, emailAction, loadFixtures, publishAction } from "./test-helpers";

const failedIds = (action: Parameters<typeof runCodeChecks>[0]) =>
  runCodeChecks(action)
    .filter((check) => !check.passed)
    .map((check) => check.id);

describe("límite de destinatarios", () => {
  it("500 pasa y 501 se frena", () => {
    expect(failedIds(emailAction({ recipientCount: 500 }))).toEqual([]);
    expect(failedIds(emailAction({ recipientCount: 501 }))).toEqual(["recipient_limit"]);
  });
});

describe("ventana de envío (hora de Colombia)", () => {
  // 2026-10-19 es lunes, 2026-10-20 martes, 2026-10-24 sábado y 2026-10-25 domingo.
  it.each([
    ["2026-10-20T07:59:00-05:00", false],
    ["2026-10-20T08:00:00-05:00", true],
    ["2026-10-20T17:59:00-05:00", true],
    ["2026-10-20T18:00:00-05:00", false],
    ["2026-10-24T10:00:00-05:00", true],
    ["2026-10-25T10:00:00-05:00", false],
    ["2026-10-19T10:00:00-05:00", true],
  ])("%s dentro de la ventana: %s", (iso, expected) => {
    expect(isInsideSendWindow(iso)).toBe(expected);
  });

  it("usa la fecha de la propia acción, no el reloj real", () => {
    const local = colombiaTime("2026-10-25T10:00:00-05:00");
    expect(local.weekdayName).toBe("domingo");
    expect(local.time).toBe("10:00");
  });

  it("un correo fuera de la ventana falla send_window", () => {
    expect(failedIds(emailAction({ scheduledFor: "2026-10-22T07:59:00-05:00" }))).toEqual(["send_window"]);
  });
});

describe("CRM", () => {
  it("20 registros pasa y 21 se frena", () => {
    expect(failedIds(crmAction({ recordCount: 20 }))).toEqual([]);
    expect(failedIds(crmAction({ recordCount: 21 }))).toEqual(["crm_batch_size"]);
  });

  it("un campo fuera de la lista se frena aunque haya otro permitido", () => {
    const action = crmAction({
      changes: [
        { field: "notes", newValue: "ok" },
        { field: "payment_status", newValue: "pagado" },
      ],
    });
    expect(failedIds(action)).toEqual(["allowed_fields"]);
  });

  it("dos fallas producen dos motivos", () => {
    const action = crmAction({ recordCount: 150, changes: [{ field: "deal_amount", newValue: "1" }] });
    expect(failedCheckCodes(runCodeChecks(action))).toEqual(["field_not_allowed", "bulk_crm_change"]);
  });
});

describe("publicaciones", () => {
  it("no tienen chequeos de código", () => {
    expect(runCodeChecks(publishAction())).toEqual([]);
  });
});

describe("fixtures", () => {
  it("las acciones con etiqueta code-check fallan exactamente el chequeo esperado, sin JEV", () => {
    const labeled = loadFixtures().filter((item) => item.tags.includes("code-check"));
    expect(labeled.length).toBeGreaterThan(0);
    for (const { action, expected } of labeled) {
      expect(failedCheckCodes(runCodeChecks(action)), action.id).toEqual([expected.trigger]);
    }
  });

  it("ninguna acción sin etiqueta code-check falla un chequeo de código", () => {
    for (const { action } of loadFixtures().filter((item) => !item.tags.includes("code-check"))) {
      expect(failedCheckCodes(runCodeChecks(action)), action.id).toEqual([]);
    }
  });
});
