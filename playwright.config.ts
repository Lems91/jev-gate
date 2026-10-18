import { defineConfig } from "@playwright/test";

// Smoke del flujo principal. Corre contra el build de producción en modo replay: no llama a JEV ni gasta créditos.
const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: "escritorio", use: { viewport: { width: 1400, height: 900 } } },
    { name: "movil", use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
