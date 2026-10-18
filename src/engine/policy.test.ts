import { describe, expect, it } from "vitest";
import { applyPolicy } from "./policy";
import { bool, choice, cleanAnswers, withAnswers } from "./test-helpers";

describe("política", () => {
  it("respuestas limpias => PASA con motivo none", () => {
    expect(applyPolicy(cleanAnswers())).toEqual({ verdict: "PASA", codes: ["none"] });
  });

  it("unsupported_offer: 0.90 frena, 0.89 y 0.50 escalan, 0.49 pasa", () => {
    expect(applyPolicy(withAnswers(bool("unsupported_offer", 0.9)))).toEqual({ verdict: "FRENA", codes: ["unsupported_offer"] });
    expect(applyPolicy(withAnswers(bool("unsupported_offer", 0.89)))).toEqual({ verdict: "ESCALA", codes: ["ambiguous_offer"] });
    expect(applyPolicy(withAnswers(bool("unsupported_offer", 0.5))).verdict).toBe("ESCALA");
    expect(applyPolicy(withAnswers(bool("unsupported_offer", 0.49))).verdict).toBe("PASA");
  });

  it("third_party_instruction: 0.90 frena, 0.60 escala", () => {
    expect(applyPolicy(withAnswers(bool("third_party_instruction", 0.9)))).toEqual({ verdict: "FRENA", codes: ["third_party_instruction"] });
    expect(applyPolicy(withAnswers(bool("third_party_instruction", 0.6)))).toEqual({ verdict: "ESCALA", codes: ["third_party_instruction"] });
  });

  it("audience_mismatch y off_brand_tone escalan desde 0.50", () => {
    expect(applyPolicy(withAnswers(bool("audience_mismatch", 0.5)))).toEqual({ verdict: "ESCALA", codes: ["audience_mismatch"] });
    expect(applyPolicy(withAnswers(bool("off_brand_tone", 0.7)))).toEqual({ verdict: "ESCALA", codes: ["off_brand_tone"] });
    expect(applyPolicy(withAnswers(bool("off_brand_tone", 0.49))).verdict).toBe("PASA");
  });

  it("action_kind other siempre escala, aunque la confianza sea alta", () => {
    expect(applyPolicy(withAnswers(choice("action_kind", "other", 0.99)))).toEqual({ verdict: "ESCALA", codes: ["action_kind_other"] });
  });

  it("en action_kind, baja confianza o sin distribución escalan", () => {
    expect(applyPolicy(withAnswers(choice("action_kind", "mass_email", 0.49))).codes).toEqual(["action_kind_other"]);
    expect(applyPolicy(withAnswers(choice("action_kind", "mass_email", undefined))).codes).toEqual(["action_kind_other"]);
  });

  it("riesgo high, critical u other escalan; low y medium con buena confianza pasan", () => {
    for (const level of ["high", "critical", "other"]) {
      expect(applyPolicy(withAnswers(choice("risk_level", level, 0.9))).codes, level).toEqual(["high_risk"]);
    }
    for (const level of ["low", "medium"]) {
      expect(applyPolicy(withAnswers(choice("risk_level", level, 0.9))).verdict, level).toBe("PASA");
    }
  });

  it("risk_level no usa la confianza: low o medium pasan aunque la confianza sea baja", () => {
    expect(applyPolicy(withAnswers(choice("risk_level", "low", 0.4))).verdict).toBe("PASA");
    expect(applyPolicy(withAnswers(choice("risk_level", "medium", undefined))).verdict).toBe("PASA");
    expect(applyPolicy(withAnswers(choice("risk_level", "high", 0.4))).codes).toEqual(["high_risk"]);
  });

  it("un motivo de bloqueo gana a uno de escalamiento", () => {
    const outcome = applyPolicy(withAnswers(bool("unsupported_offer", 0.95), bool("off_brand_tone", 0.8)));
    expect(outcome).toEqual({ verdict: "FRENA", codes: ["unsupported_offer"] });
  });

  it("varios motivos de escalamiento se listan todos, en orden", () => {
    const outcome = applyPolicy(withAnswers(bool("audience_mismatch", 0.8), bool("off_brand_tone", 0.8)));
    expect(outcome).toEqual({ verdict: "ESCALA", codes: ["audience_mismatch", "off_brand_tone"] });
  });

  it("los umbrales son configurables", () => {
    const custom = { block: 0.8, escalate: 0.3, minConfidence: 0.5 };
    expect(applyPolicy(withAnswers(bool("unsupported_offer", 0.85)), custom).verdict).toBe("FRENA");
    expect(applyPolicy(withAnswers(bool("off_brand_tone", 0.35)), custom).verdict).toBe("ESCALA");
  });
});
