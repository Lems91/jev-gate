// El portero: junta chequeos de código, JEV y política en una Decision. No ejecuta nada de la acción.
import type { Action, Decision } from "../contracts/schemas";
import { runCodeChecks } from "./checks";
import { JEV_PRICE_USD_PER_MILLION_INPUT_TOKENS, MAX_PARALLEL_CALLS, THRESHOLDS } from "./config";
import type { JevClient } from "./jev-client";
import { applyPolicy, failedCheckCodes, type Thresholds } from "./policy";
import { buildJevRequest } from "./questions";
import { composeReasons } from "./reasons";

export interface GateOptions {
  client: JevClient;
  thresholds?: Thresholds;
  // Recibe el error técnico cuando JEV falla (la Decision solo lleva el motivo jev_unavailable).
  onJevError?: (action: Action, error: unknown) => void;
}

export function costFromTokens(inputTokens: number): number {
  return (inputTokens * JEV_PRICE_USD_PER_MILLION_INPUT_TOKENS) / 1_000_000;
}

export async function decideAction(action: Action, { client, thresholds = THRESHOLDS, onJevError }: GateOptions): Promise<Decision> {
  const started = performance.now();
  const checks = runCodeChecks(action);
  const failed = failedCheckCodes(checks);

  // Un chequeo de código fallido frena sin llamar a JEV: más barato y determinista.
  if (failed.length > 0) {
    return {
      actionId: action.id,
      verdict: "FRENA",
      reasons: composeReasons(failed, { action, checks, answers: [], thresholds }),
      checks,
      answers: [],
      mode: client.mode,
      latencyMs: performance.now() - started,
      inputTokens: 0,
      costUsd: 0,
    };
  }

  try {
    const result = await client.ask(buildJevRequest(action));
    const outcome = applyPolicy(result.answers, thresholds);
    return {
      actionId: action.id,
      verdict: outcome.verdict,
      reasons: composeReasons(outcome.codes, { action, checks, answers: result.answers, thresholds }),
      checks,
      answers: result.answers,
      mode: client.mode,
      // Latencia = trabajo local + llamada a JEV (en replay, la latencia grabada).
      latencyMs: performance.now() - started + (client.mode === "replay" ? result.latencyMs : 0),
      inputTokens: result.inputTokens,
      costUsd: costFromTokens(result.inputTokens),
    };
  } catch (error) {
    onJevError?.(action, error);
    // Sin respuesta de JEV nunca se deja pasar: se escala a una persona.
    return {
      actionId: action.id,
      verdict: "ESCALA",
      reasons: composeReasons(["jev_unavailable"], { action, checks, answers: [], thresholds }),
      checks,
      answers: [],
      mode: client.mode,
      latencyMs: performance.now() - started,
      inputTokens: 0,
      costUsd: 0,
    };
  }
}

// Ejecuta una función sobre cada elemento con un máximo de tareas simultáneas, conservando el orden.
export async function mapWithLimit<T, R>(items: readonly T[], limit: number, work: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export function decideMany(actions: readonly Action[], options: GateOptions, limit: number = MAX_PARALLEL_CALLS): Promise<Decision[]> {
  return mapWithLimit(actions, limit, (action) => decideAction(action, options));
}
