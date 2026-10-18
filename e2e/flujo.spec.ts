import { expect, test } from "@playwright/test";

test("proponer, escalar, aprobar y ver el registro", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "JEV Gate" })).toBeVisible();
  await expect(page.getByText("Calibrado sobre el set de desarrollo de 48 acciones")).toBeVisible();

  // Una acción que el portero escala (A-002) se busca y se abre.
  await page.getByLabel("Buscar por id, tipo, agente o texto").fill("A-002");
  await page.getByRole("button", { name: /A-002/ }).click();
  await expect(page.getByTestId("provenance")).toHaveText("Decisión grabada de una corrida real");
  await expect(page.getByTestId("verdict")).toContainText("ESCALA");

  // Proponer: queda en la cola de revisión y en el registro.
  await page.getByRole("button", { name: "Proponer al portero y registrar" }).click();
  await expect(page.getByTestId("queue")).toContainText("A-002");
  await expect(page.getByTestId("audit-status")).toHaveText("Pendiente de revisión");

  // Aprobar: sale de la cola y el registro lo muestra resuelto por una persona.
  await page.getByRole("button", { name: "Aprobar" }).click();
  await expect(page.getByTestId("queue-empty")).toBeVisible();
  await expect(page.getByTestId("audit-status")).toHaveText("Aprobada por una persona");
  await expect(page.getByTestId("audit-log")).toContainText("Revisor del demo");
});

test("un escenario destacado se muestra como grabado, con motivo y chequeos", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Cambio masivo de CRM/ }).click();
  await expect(page.getByTestId("verdict")).toContainText("FRENA");
  await expect(page.getByText("No cumple")).toBeVisible();
  await expect(page.getByTestId("provenance")).toHaveText("Decisión grabada de una corrida real");
});

test("el servidor rechaza un texto de más de 600 caracteres sin llamar a JEV", async ({ request }) => {
  const response = await request.post("/api/evaluate", {
    data: { type: "mass_email", count: 10, scheduledLocal: "2026-10-20T10:00", text: "a".repeat(601), fromThirdParty: false },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toContain("600");
});
