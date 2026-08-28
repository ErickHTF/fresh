const ANSI = {
  dim: "\x1b[90m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  reset: "\x1b[0m",
};

export function logDemo(prefix: string, message: string): void {
  const time = new Date().toISOString().slice(11, 23);
  console.log(`${ANSI.dim}[${time}]${ANSI.reset} ${prefix} ${message}`);
}

export function logRequest(method: string, path: string): void {
  logDemo(`${ANSI.cyan}▶${ANSI.reset} ${method}`, path);
}

export function logResponse(method: string, path: string, ms: number): void {
  logDemo(
    `${ANSI.green}✔${ANSI.reset} ${method}`,
    `${path} — ${ms.toFixed(1)}ms`,
  );
}

export async function timeAction<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  const result = await fn();
  logDemo(
    `${ANSI.green}✔${ANSI.reset}`,
    `${label} — ${(performance.now() - startedAt).toFixed(1)}ms`,
  );
  return result;
}
