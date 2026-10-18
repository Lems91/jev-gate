// Cliente de JEV con tres modos: live (llama al Gateway), record (llama y graba) y replay (solo lee grabaciones).
// Una sola llamada por acción con todas sus preguntas. Las grabaciones se identifican por el hash de la
// petición (modelo + estado + preguntas): si algo de la petición cambia, la grabación vieja deja de aplicar.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { experimental_decide as decide } from "ai";
import { z } from "zod";
import {
  JevAnswerSchema,
  JevModeSchema,
  type JevAnswer,
  type JevMode,
  type JevRequest,
} from "../contracts/schemas";
import { JEV_MODEL, JEV_TIMEOUT_MS } from "./config";

export interface JevCallResult {
  answers: JevAnswer[];
  latencyMs: number;
  inputTokens: number;
}

// Hace la llamada real. Se puede reemplazar en los tests.
export type JevCaller = (request: JevRequest) => Promise<JevCallResult>;

export interface JevClient {
  mode: JevMode;
  ask(request: JevRequest): Promise<JevCallResult>;
}

export const RECORDINGS_DIR = join(process.cwd(), "recordings");

// ---------- Grabaciones ----------

const RecordingSchema = z.object({
  version: z.literal(1),
  model: z.string(),
  actionId: z.string(),
  requestHash: z.string(),
  latencyMs: z.number().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  answers: z.array(JevAnswerSchema).min(1),
});
type Recording = z.infer<typeof RecordingSchema>;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function requestHash(request: JevRequest, model: string = JEV_MODEL): string {
  const { state, questions } = request;
  return createHash("sha256").update(stableStringify({ model, state, questions })).digest("hex").slice(0, 16);
}

function recordingPath(dir: string, hash: string): string {
  return join(dir, `${hash}.json`);
}

export class JevRecordingMissingError extends Error {
  constructor(actionId: string, hash: string) {
    super(`No hay grabación de JEV para la acción ${actionId} (petición ${hash}). Corre "npm run eval:record" para grabarla.`);
    this.name = "JevRecordingMissingError";
  }
}

// ---------- Llamada real ----------

// Llamada real a JEV por el Gateway. Las preguntas Choice van con la opción "other" ya incluida (questions.ts).
export const liveCaller: JevCaller = async (request) => {
  const questions = Object.fromEntries(
    request.questions.map((question) => [
      question.id,
      question.kind === "boolean"
        ? ({ type: "boolean", instructions: question.instructions } as const)
        : ({ type: "choice", instructions: question.instructions, criteria: question.criteria } as const),
    ]),
  );

  const started = performance.now();
  const result = await decide({
    model: JEV_MODEL,
    state: request.state,
    questions,
    abortSignal: AbortSignal.timeout(JEV_TIMEOUT_MS),
  });
  const latencyMs = performance.now() - started;

  const answers = request.questions.map((question): JevAnswer => {
    const raw = result.answers[question.id];
    if (!raw) throw new Error(`JEV no devolvió respuesta para ${question.id}`);
    return JevAnswerSchema.parse(
      raw.type === "boolean"
        ? { questionId: question.id, kind: "boolean", probability: raw.probability }
        : raw.type === "choice"
          ? { questionId: question.id, kind: "choice", choice: raw.choice, probabilities: raw.probabilities }
          : (() => {
              throw new Error(`Tipo de respuesta inesperado en ${question.id}: ${String((raw as { type: unknown }).type)}`);
            })(),
    );
  });

  const inputTokens = result.usage.inputTokens;
  if (inputTokens === undefined) throw new Error("JEV no informó los tokens de entrada; no se puede calcular el costo");
  return { answers, latencyMs, inputTokens };
};

// ---------- Cliente ----------

export interface JevClientOptions {
  mode: JevMode;
  recordingsDir?: string;
  caller?: JevCaller;
  model?: string;
}

export function createJevClient({ mode, recordingsDir = RECORDINGS_DIR, caller = liveCaller, model = JEV_MODEL }: JevClientOptions): JevClient {
  return {
    mode,
    async ask(request) {
      const hash = requestHash(request, model);
      const file = recordingPath(recordingsDir, hash);

      if (mode === "replay") {
        if (!existsSync(file)) throw new JevRecordingMissingError(request.actionId, hash);
        const recording = RecordingSchema.parse(JSON.parse(readFileSync(file, "utf8")));
        return { answers: recording.answers, latencyMs: recording.latencyMs, inputTokens: recording.inputTokens };
      }

      const result = await caller(request);
      if (mode === "record") {
        const recording: Recording = {
          version: 1,
          model,
          actionId: request.actionId,
          requestHash: hash,
          latencyMs: result.latencyMs,
          inputTokens: result.inputTokens,
          answers: result.answers,
        };
        mkdirSync(recordingsDir, { recursive: true });
        writeFileSync(file, `${JSON.stringify(recording, null, 2)}\n`, "utf8");
      }
      return result;
    },
  };
}

// JEV_MODE=live|record|replay. Si no está definido, replay: no gasta créditos ni necesita red.
export function modeFromEnv(value: string | undefined = process.env.JEV_MODE): JevMode {
  if (value === undefined || value === "") return "replay";
  const parsed = JevModeSchema.safeParse(value);
  if (!parsed.success) throw new Error(`JEV_MODE inválido: "${value}". Usa live, record o replay.`);
  return parsed.data;
}
