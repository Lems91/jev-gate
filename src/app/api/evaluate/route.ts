// Evaluación en vivo de "prueba tu acción". JEV solo se llama desde aquí (servidor): la clave nunca llega al navegador.
import { NextResponse } from "next/server";
import { colombiaIso } from "@/engine/audit";
import { buildCustomAction, CustomActionInputSchema } from "@/engine/custom-action";
import { decideAction } from "@/engine/gate";
import { createJevClient, type JevClient } from "@/engine/jev-client";
import { LiveLimiter } from "@/server/limits";

// Una instancia por proceso del servidor (ver limits.ts: no es un tope duro entre instancias).
const limiter = new LiveLimiter();

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "desconocida";
}

// Un formulario válido pesa menos de 1 KB (600 caracteres de texto); más que esto no es el formulario.
const MAX_BODY_BYTES = 4096;
const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "La petición debe ser application/json." }, { status: 415, headers: NO_STORE });
  }
  // Se lee el cuerpo con tope de tamaño antes de interpretarlo.
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "La petición es demasiado grande." }, { status: 413, headers: NO_STORE });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "La petición no es un JSON válido." }, { status: 400, headers: NO_STORE });
  }
  const parsed = CustomActionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((issue) => issue.message).join(". ") }, { status: 400, headers: NO_STORE });
  }

  let action;
  try {
    action = buildCustomAction(parsed.data, colombiaIso(new Date()));
  } catch {
    return NextResponse.json({ error: "Los datos no forman una acción válida (revisa la fecha y el número)." }, { status: 400, headers: NO_STORE });
  }

  // El cupo se reserva justo antes de llamar a JEV: si el código frena la acción, no cuesta ni cuenta.
  const ip = clientIp(request);
  const live = createJevClient({ mode: "live" });
  const limited: { message: string | null } = { message: null };
  const client: JevClient = {
    mode: "live",
    async ask(jevRequest) {
      const result = limiter.tryAcquire(ip, Date.now());
      if (!result.allowed) {
        limited.message = result.message;
        throw new Error(result.message);
      }
      return live.ask(jevRequest);
    },
  };

  const decision = await decideAction(action, {
    client,
    onJevError: (_action, error) => console.error("JEV no respondió en la evaluación en vivo:", error instanceof Error ? error.message : error),
  });
  if (limited.message) return NextResponse.json({ error: limited.message, limited: true }, { status: 429, headers: NO_STORE });
  return NextResponse.json({ action, decision }, { headers: NO_STORE });
}
