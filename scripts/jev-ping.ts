// Ping a JEV vía Vercel AI Gateway: UNA llamada real, muestra probabilidad, latencia y tokens.
// Uso: npm run jev:ping  (lee AI_GATEWAY_API_KEY de .env.local)
import { experimental_decide as decide } from "ai";

const MODEL = "typesafe-ai/jev";

async function main(): Promise<void> {
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.error("Falta AI_GATEWAY_API_KEY en .env.local");
    process.exit(1);
  }

  const started = performance.now();
  const result = await decide({
    model: MODEL,
    state:
      "Draft email from an internal agent: 'Congratulations! Your company has been pre-approved for a free helicopter tour with every purchase.'",
    questions: {
      unsupported_offer: {
        type: "boolean",
        instructions:
          "Does the email promise a product or service that a software consultancy would not normally sell (for example a helicopter tour)?",
      },
    },
  });
  const latencyMs = Math.round(performance.now() - started);

  const answer = result.answers.unsupported_offer;
  console.log(
    JSON.stringify(
      {
        model: MODEL,
        question: "unsupported_offer",
        answer,
        latencyMs,
        usage: result.usage,
      },
      null,
      2,
    ),
  );
}

main().catch((err: unknown) => {
  console.error("Fallo la llamada a JEV:", err instanceof Error ? err.message : err);
  process.exit(1);
});
