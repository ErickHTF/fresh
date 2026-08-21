export function calculatePoints(
  durationSeconds: number,
  startedAt: Date,
  answeredAt: Date,
): number {
  const elapsedSeconds = Math.max(
    0,
    (answeredAt.getTime() - startedAt.getTime()) / 1000,
  );
  const speedBonus = Math.max(
    0,
    Math.round(500 * (1 - elapsedSeconds / durationSeconds)),
  );
  return 1000 + speedBonus;
}

export function isDeadlineExpired(deadlineAt: Date, now = new Date()): boolean {
  return now.getTime() > deadlineAt.getTime();
}
