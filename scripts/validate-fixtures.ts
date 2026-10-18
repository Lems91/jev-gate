// Valida fixtures/actions.json: esquemas, distribución 16/16/16 y coherencia de cada etiqueta
// con los límites del catálogo. No es el motor: solo verifica que los datos digan la verdad.
// Uso: npm run fixtures:check
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ALLOWED_CRM_FIELDS, LIMITS, OFFER_CATALOG } from "../src/contracts/catalog";
import { LabeledActionsSchema, type Action, type LabeledAction, type ReasonCode } from "../src/contracts/schemas";

// Motivos que debe detectar un chequeo de código (el resto lo decide JEV o no aplica).
const CODE_CHECK_TRIGGERS: ReasonCode[] = [
  "recipient_limit",
  "outside_send_window",
  "field_not_allowed",
  "bulk_crm_change",
];

const errors: string[] = [];
const fail = (id: string, message: string) => errors.push(`${id}: ${message}`);

// Fecha y hora local tal como vienen escritas (todas en -05:00); el día de la semana sale de la fecha.
function localParts(iso: string): { weekday: number; hour: number } {
  const [date, time] = iso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  return { weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay(), hour: Number(time.slice(0, 2)) + Number(time.slice(3, 5)) / 60 };
}

function failedCodeChecks(action: Action): ReasonCode[] {
  const failed: ReasonCode[] = [];
  if (action.type === "mass_email") {
    if (action.recipientCount > LIMITS.maxRecipients) failed.push("recipient_limit");
    const { weekday, hour } = localParts(action.scheduledFor);
    const { startHour, endHour, allowedWeekdays } = LIMITS.sendWindow;
    if (!(allowedWeekdays as readonly number[]).includes(weekday) || hour < startHour || hour >= endHour) {
      failed.push("outside_send_window");
    }
  }
  if (action.type === "crm_update") {
    const allowed: readonly string[] = ALLOWED_CRM_FIELDS;
    if (action.changes.some((change) => !allowed.includes(change.field))) failed.push("field_not_allowed");
    if (action.recordCount > LIMITS.maxCrmRecords) failed.push("bulk_crm_change");
  }
  // La ventana de envío solo aplica a correos; las publicaciones no tienen chequeo de código.
  return failed;
}

function main(): void {
  const raw = JSON.parse(readFileSync(join(process.cwd(), "fixtures", "actions.json"), "utf8"));
  const parsed = LabeledActionsSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("Los fixtures NO validan contra los esquemas:");
    for (const issue of parsed.error.issues) console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    process.exit(1);
  }
  const items: LabeledAction[] = parsed.data;

  const ids = new Set<string>();
  for (const { action, expected, tags } of items) {
    if (ids.has(action.id)) fail(action.id, "id repetido");
    ids.add(action.id);

    // Coherencia entre el veredicto y el motivo esperado.
    const isCodeTrigger = CODE_CHECK_TRIGGERS.includes(expected.trigger);
    if (expected.verdict === "PASA" && expected.trigger !== "none") fail(action.id, "PASA exige trigger none");
    if (expected.verdict !== "PASA" && expected.trigger === "none") fail(action.id, "FRENA/ESCALA exige un trigger");
    if (expected.verdict === "ESCALA" && isCodeTrigger) fail(action.id, "un chequeo de código frena, no escala");

    // Los chequeos de código deben fallar exactamente cuando la etiqueta lo dice.
    const failed = failedCodeChecks(action);
    if (isCodeTrigger) {
      if (!failed.includes(expected.trigger)) fail(action.id, `se esperaba que fallara ${expected.trigger} y no falla`);
      if (!tags.includes("code-check")) fail(action.id, 'falta la etiqueta "code-check"');
    } else if (failed.length > 0) {
      fail(action.id, `no debería fallar un chequeo de código (${failed.join(", ")}) con trigger ${expected.trigger}`);
    }

    // Ningún chequeo de código sobra: una acción con dos fallas esconde cuál es la causa esperada.
    if (failed.length > 1) fail(action.id, `falla más de un chequeo de código: ${failed.join(", ")}`);
    if (action.type === "mass_email" && action.recipientCount === 0) fail(action.id, "sin destinatarios");
  }

  // Distribución 16/16/16 y mezcla de tipos.
  const byVerdict = count(items.map((item) => item.expected.verdict));
  for (const verdict of ["PASA", "ESCALA", "FRENA"]) {
    if (byVerdict[verdict] !== 16) fail("distribución", `${verdict} tiene ${byVerdict[verdict] ?? 0}, se esperaban 16`);
  }
  const byType = count(items.map((item) => item.action.type));
  for (const type of ["mass_email", "crm_update", "publish_content"]) {
    if (!byType[type]) fail("distribución", `no hay acciones de tipo ${type}`);
  }

  // Casos trampa exigidos por el plan.
  const hasTag = (tag: string) => items.some((item) => item.tags.includes(tag));
  for (const tag of ["unsupported-offer", "bulk-crm", "prompt-injection", "looks-suspicious-but-safe"]) {
    if (!hasTag(tag)) fail("trampas", `falta un caso con la etiqueta ${tag}`);
  }
  if (!items.some((item) => item.expected.trigger === "field_not_allowed")) fail("trampas", "falta un caso de campo no permitido");

  if (errors.length > 0) {
    console.error(`Fixtures con ${errors.length} problema(s):`);
    for (const message of errors) console.error(`  - ${message}`);
    process.exit(1);
  }

  const byTrigger = count(items.map((item) => `${item.expected.verdict}/${item.expected.trigger}`));
  console.log(`OK: ${items.length} acciones validan contra los esquemas.`);
  console.log("Por veredicto:", byVerdict);
  console.log("Por tipo:", byType);
  console.log("Por veredicto/motivo:", byTrigger);
  console.log(`Catálogo: ${OFFER_CATALOG.map((offer) => offer.name).join(", ")}`);
}

function count(values: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return result;
}

main();
