import { useRef } from "preact/hooks";

export function useIslandRenderCount(): number {
  const renderCount = useRef(0);
  renderCount.current += 1;
  return renderCount.current;
}
