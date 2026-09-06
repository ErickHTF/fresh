import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";

interface CountdownProps {
  deadlineAt: string | null;
  onExpired?: () => void;
}

export function Countdown({ deadlineAt, onExpired }: CountdownProps) {
  const remaining = useSignal(0);

  useEffect(() => {
    let expired = false;

    function update() {
      if (!deadlineAt) return;
      const next = Math.max(
        0,
        Math.ceil((new Date(deadlineAt).getTime() - Date.now()) / 1000),
      );
      remaining.value = next;
      if (next === 0 && !expired) {
        expired = true;
        onExpired?.();
      }
    }

    update();
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [deadlineAt]);

  return (
    <div
      class={`timer ${remaining.value <= 5 ? "timer-warning" : ""}`}
      role="timer"
    >
      {remaining.value}s
    </div>
  );
}
