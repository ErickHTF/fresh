import { signal } from "@preact/signals";

export type TraceSource = "clique" | "sse" | "efeito" | "http";

export interface TraceEntry {
  time: string;
  source: TraceSource;
  message: string;
  renders: number;
}

export const trace = signal<TraceEntry[]>([]);

function timestamp(): string {
  const now = new Date();
  const pad = (n: number, length = 2) => String(n).padStart(length, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${
    pad(now.getSeconds())
  }.${pad(now.getMilliseconds(), 3)}`;
}

export function pushTrace(
  source: TraceSource,
  message: string,
  renders = 1,
): void {
  trace.value = [...trace.value, {
    time: timestamp(),
    source,
    message,
    renders,
  }];
}

export function clearTrace(): void {
  trace.value = [];
}
