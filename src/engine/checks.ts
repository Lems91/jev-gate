// Chequeos de código: deterministas, sin JEV. Cuentan, comparan fechas y revisan listas permitidas.
import { ALLOWED_CRM_FIELDS, LIMITS } from "../contracts/catalog";
import type { Action, CodeCheck } from "../contracts/schemas";

const UTC_OFFSET_MINUTES = -5 * 60;
const WEEKDAYS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;

export interface LocalTime {
  weekday: number;
  weekdayName: string;
  date: string;
  time: string;
  minutesOfDay: number;
}

// Hora local de Colombia de una fecha ISO. Solo usa la fecha recibida, nunca el reloj real.
export function colombiaTime(iso: string): LocalTime {
  const shifted = new Date(Date.parse(iso) + UTC_OFFSET_MINUTES * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const weekday = shifted.getUTCDay();
  return {
    weekday,
    weekdayName: WEEKDAYS_ES[weekday],
    date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
    minutesOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

export function isInsideSendWindow(iso: string): boolean {
  const { startHour, endHour, allowedWeekdays } = LIMITS.sendWindow;
  const local = colombiaTime(iso);
  return (
    (allowedWeekdays as readonly number[]).includes(local.weekday) &&
    local.minutesOfDay >= startHour * 60 &&
    local.minutesOfDay < endHour * 60
  );
}

export function disallowedCrmFields(action: Extract<Action, { type: "crm_update" }>): string[] {
  const allowed: readonly string[] = ALLOWED_CRM_FIELDS;
  return [...new Set(action.changes.map((change) => change.field).filter((field) => !allowed.includes(field)))];
}

// Devuelve solo los chequeos que aplican al tipo de acción, con su resultado y un detalle legible.
export function runCodeChecks(action: Action): CodeCheck[] {
  if (action.type === "mass_email") {
    const local = colombiaTime(action.scheduledFor);
    const { startHour, endHour } = LIMITS.sendWindow;
    return [
      {
        id: "recipient_limit",
        passed: action.recipientCount <= LIMITS.maxRecipients,
        detail: `${action.recipientCount} destinatarios (límite ${LIMITS.maxRecipients})`,
      },
      {
        id: "send_window",
        passed: isInsideSendWindow(action.scheduledFor),
        detail: `envío ${local.weekdayName} ${local.date} ${local.time} (ventana lunes a sábado, ${String(startHour).padStart(2, "0")}:00 a ${String(endHour).padStart(2, "0")}:00)`,
      },
    ];
  }
  if (action.type === "crm_update") {
    const blocked = disallowedCrmFields(action);
    return [
      {
        id: "allowed_fields",
        passed: blocked.length === 0,
        detail: blocked.length === 0 ? `campos permitidos: ${action.changes.map((c) => c.field).join(", ")}` : `campos no permitidos: ${blocked.join(", ")}`,
      },
      {
        id: "crm_batch_size",
        passed: action.recordCount <= LIMITS.maxCrmRecords,
        detail: `${action.recordCount} registros (límite ${LIMITS.maxCrmRecords})`,
      },
    ];
  }
  // Las publicaciones no tienen chequeo de código: su riesgo lo valora JEV.
  return [];
}
