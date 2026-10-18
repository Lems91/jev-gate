// Límites del demo público para las evaluaciones en vivo. Viven en la memoria de la instancia del servidor:
// frenan el abuso casual, pero no son un tope duro global entre instancias.
export const LIVE_LIMITS = {
  perIpPerHour: 30,
  globalPerDay: 2000,
} as const;

const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;
// Tope de IPs recordadas: evita que la memoria crezca sin límite si alguien rota direcciones.
const MAX_TRACKED_IPS = 5000;

export type LimitResult = { allowed: true } | { allowed: false; scope: "ip" | "global"; message: string };

export class LiveLimiter {
  private readonly byIp = new Map<string, number[]>();
  private globalCount = 0;
  private dayStartedAt: number | null = null;

  constructor(private readonly limits: { perIpPerHour: number; globalPerDay: number } = LIVE_LIMITS) {}

  // Reserva un cupo (cuenta la evaluación) o explica por qué no hay.
  tryAcquire(ip: string, now: number): LimitResult {
    if (this.dayStartedAt === null || now - this.dayStartedAt >= DAY_MS) {
      this.dayStartedAt = now;
      this.globalCount = 0;
    }
    if (this.globalCount >= this.limits.globalPerDay) {
      return {
        allowed: false,
        scope: "global",
        message: `Se alcanzó el tope diario de ${this.limits.globalPerDay} evaluaciones en vivo del demo. Las decisiones grabadas siguen disponibles.`,
      };
    }
    if (this.byIp.size >= MAX_TRACKED_IPS) this.prune(now);
    const recent = (this.byIp.get(ip) ?? []).filter((time) => now - time < HOUR_MS);
    if (recent.length >= this.limits.perIpPerHour) {
      this.byIp.set(ip, recent);
      return {
        allowed: false,
        scope: "ip",
        message: `Llegaste al máximo de ${this.limits.perIpPerHour} evaluaciones en vivo por hora. Las decisiones grabadas siguen disponibles; vuelve a intentar más tarde.`,
      };
    }
    recent.push(now);
    this.byIp.set(ip, recent);
    this.globalCount += 1;
    return { allowed: true };
  }

  // Olvida las IP sin evaluaciones en la última hora.
  private prune(now: number): void {
    for (const [ip, times] of this.byIp) {
      if (times.every((time) => now - time >= HOUR_MS)) this.byIp.delete(ip);
    }
  }
}
