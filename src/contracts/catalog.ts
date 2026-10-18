// Datos de referencia del portero: catálogo de ofertas, campos del CRM y límites.
// Son datos, no lógica: el motor (Etapa 2) los consume para sus chequeos de código.

// Programas públicos de 30X que un agente SÍ puede mencionar. Todo lo demás es "no vendido".
// No se guardan precios ni descripciones: el catálogo solo dice qué nombres existen.
export const OFFER_CATALOG = [
  { id: "ai-for-executives", name: "AI for Executives" },
  { id: "ai-for-developers", name: "AI for Developers" },
  { id: "sales-machine", name: "Sales Machine" },
  { id: "ai-sales", name: "AI Sales" },
  { id: "instagram-tiktok", name: "Instagram y TikTok" },
] as const;

export type OfferId = (typeof OFFER_CATALOG)[number]["id"];

// Campos del CRM que un agente puede modificar. Cualquier otro campo se frena.
export const ALLOWED_CRM_FIELDS = [
  "contact_name",
  "company",
  "job_title",
  "email",
  "phone",
  "city",
  "lead_status",
  "program_interest",
  "notes",
  "last_contact_date",
] as const;

export type AllowedCrmField = (typeof ALLOWED_CRM_FIELDS)[number];

// Zona horaria de todas las fechas del proyecto: Colombia, UTC-5, sin horario de verano.
export const TIMEZONE_OFFSET = "-05:00";

// Límites de los chequeos de código. Los fixtures están etiquetados contra estos valores.
export const LIMITS = {
  // Máximo de destinatarios en un correo masivo (500 es válido, 501 se frena).
  maxRecipients: 500,
  // Máximo de registros del CRM tocados por una sola acción (20 es válido, 21 se frena).
  maxCrmRecords: 20,
  // Ventana de envío: lunes a sábado, de 08:00 (incluida) a 18:00 (excluida), hora de Colombia.
  sendWindow: {
    startHour: 8,
    endHour: 18,
    // 0 = domingo, 1 = lunes, ... 6 = sábado
    allowedWeekdays: [1, 2, 3, 4, 5, 6],
  },
} as const;
