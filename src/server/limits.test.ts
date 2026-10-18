import { describe, expect, it } from "vitest";
import { LiveLimiter } from "./limits";

const HOUR = 60 * 60_000;

describe("LiveLimiter", () => {
  it("permite hasta el máximo por IP y luego bloquea", () => {
    const limiter = new LiveLimiter({ perIpPerHour: 2, globalPerDay: 100 });
    expect(limiter.tryAcquire("1.1.1.1", 0).allowed).toBe(true);
    expect(limiter.tryAcquire("1.1.1.1", 1).allowed).toBe(true);
    expect(limiter.tryAcquire("1.1.1.1", 2)).toMatchObject({ allowed: false, scope: "ip" });
    // Otra IP no se ve afectada.
    expect(limiter.tryAcquire("2.2.2.2", 3).allowed).toBe(true);
  });

  it("libera el cupo de una IP pasada una hora", () => {
    const limiter = new LiveLimiter({ perIpPerHour: 1, globalPerDay: 100 });
    expect(limiter.tryAcquire("1.1.1.1", 0).allowed).toBe(true);
    expect(limiter.tryAcquire("1.1.1.1", HOUR - 1).allowed).toBe(false);
    expect(limiter.tryAcquire("1.1.1.1", HOUR).allowed).toBe(true);
  });

  it("aplica el tope global diario y lo reinicia al día siguiente", () => {
    const limiter = new LiveLimiter({ perIpPerHour: 100, globalPerDay: 2 });
    expect(limiter.tryAcquire("a", 0).allowed).toBe(true);
    expect(limiter.tryAcquire("b", 1).allowed).toBe(true);
    expect(limiter.tryAcquire("c", 2)).toMatchObject({ allowed: false, scope: "global" });
    expect(limiter.tryAcquire("c", 24 * HOUR).allowed).toBe(true);
  });
});
