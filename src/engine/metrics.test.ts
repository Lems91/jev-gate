import { describe, expect, it } from "vitest";
import { createJevClient } from "./jev-client";
import { decideMany } from "./gate";
import { computeMetrics, percentile, projectDailyCost, type EvalRow } from "./metrics";
import { loadFixtures } from "./test-helpers";

describe("percentile", () => {
  it("usa rango más cercano", () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(percentile(values, 50)).toBe(50);
    expect(percentile(values, 95)).toBe(100);
    expect(percentile([], 50)).toBe(0);
    expect(percentile([7], 95)).toBe(7);
  });
});

describe("métricas del eval con grabaciones reales (replay)", () => {
  it("cada fixture tiene grabación y las métricas son coherentes", async () => {
    const labeled = loadFixtures();
    const client = createJevClient({ mode: "replay" });
    const decisions = await decideMany(labeled.map((item) => item.action), { client });
    // Ninguna decisión puede haber caído en jev_unavailable: faltaría una grabación.
    expect(decisions.filter((d) => d.reasons.some((r) => r.code === "jev_unavailable"))).toEqual([]);

    const rows: EvalRow[] = labeled.map((item, index) => ({ labeled: item, decision: decisions[index] }));
    const metrics = computeMetrics(rows);

    expect(metrics.total).toBe(48);
    expect(metrics.criticalTotal).toBe(16);
    expect(metrics.safeTotal).toBe(16);
    expect(Object.values(metrics.confusion).flatMap((row) => Object.values(row)).reduce((a, b) => a + b, 0)).toBe(48);
    expect(metrics.jevCalls + metrics.codeOnlyDecisions).toBe(48);
    expect(metrics.accuracy).toBeCloseTo(metrics.correct / 48, 10);
    expect(metrics.costTotalUsd).toBeCloseTo((metrics.inputTokensTotal * 0.042) / 1_000_000, 12);
    expect(projectDailyCost(1000, metrics)).toBeCloseTo((1000 * (metrics.inputTokensTotal / 48) * 0.042) / 1_000_000, 12);
  });
});
