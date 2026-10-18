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

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La petición no es un JSON válido." }, { status: 400 });
  }
  const parsed = CustomActionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((issue) => issue.message).join(". ") }, { status: 400 });
  }

  let action;
  try {
    action = buildCustomAction(parsed.data, colombiaIso(new Date()));
  } catch {
    return NextResponse.json({ error: "Los datos no forman una acción válida (revisa la fecha y el número)." }, { status: 400 });
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
  if (limited.message) return NextResponse.json({ error: limited.message, limited: true }, { status: 429 });
  return NextResponse.json({ action, decision });
}
