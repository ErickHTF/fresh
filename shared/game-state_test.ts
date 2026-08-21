import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { calculatePoints, isDeadlineExpired } from "./game-state.ts";

Deno.test("awards more points for faster correct answers", () => {
  const startedAt = new Date("2026-08-20T12:00:00.000Z");
  const fastAnswer = new Date("2026-08-20T12:00:03.000Z");
  const slowAnswer = new Date("2026-08-20T12:00:18.000Z");

  assertEquals(
    calculatePoints(20, startedAt, fastAnswer) >
      calculatePoints(20, startedAt, slowAnswer),
    true,
  );
});

Deno.test("detects expired deadlines", () => {
  const deadline = new Date("2026-08-20T12:00:20.000Z");
  const beforeDeadline = new Date("2026-08-20T12:00:19.000Z");
  const afterDeadline = new Date("2026-08-20T12:00:21.000Z");

  assertEquals(isDeadlineExpired(deadline, beforeDeadline), false);
  assertEquals(isDeadlineExpired(deadline, afterDeadline), true);
});
