import { getCookie, hostCookieName, playerCookieName } from "./cookies.ts";
import { verifyHost, verifyPlayer } from "./game.ts";

export async function authorize(
  request: Request,
  code: string,
): Promise<"host" | "player" | null> {
  const normalizedCode = code.toUpperCase();
  const hostToken = getCookie(request, hostCookieName(normalizedCode));
  if (hostToken && await verifyHost(normalizedCode, hostToken)) return "host";

  const playerToken = getCookie(request, playerCookieName(normalizedCode));
  if (playerToken && await verifyPlayer(normalizedCode, playerToken)) {
    return "player";
  }

  return null;
}
