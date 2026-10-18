import type { Action, Decision } from "@/contracts/schemas";

// Una acción con su decisión y de dónde sale: guardada de una corrida real o consultada en vivo.
export interface Proposal {
  key: string;
  action: Action;
  decision: Decision;
  origin: "recorded" | "live";
}

// Respuesta de /api/evaluate cuando todo salió bien.
export interface EvaluateResponse {
  action: Action;
  decision: Decision;
}
