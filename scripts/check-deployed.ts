// Comprueba que la URL desplegada responde 200. Parte de `npm run verify`.
// La URL se puede cambiar con DEPLOY_URL (por ejemplo, para otro despliegue).
const url = process.env.DEPLOY_URL ?? "https://jev-gate.vercel.app";

async function main(): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (response.status !== 200) {
    console.error(`La URL desplegada ${url} respondió ${response.status}, se esperaba 200.`);
    process.exit(1);
  }
  console.log(`URL desplegada OK: ${url} respondió 200.`);
}

main().catch((error: unknown) => {
  console.error(`No se pudo comprobar ${url}:`, error instanceof Error ? error.message : error);
  process.exit(1);
});
