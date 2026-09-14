import { getCookie, hostCookieName, playerCookieName } from "./cookies.ts";
import { verifyHost, verifyPlayer } from "./game.ts";

export async function authorize(
  request: Request,
  code: string,
): Promise<"host" | "player" | null> {
  const hostToken = getCookie(request, hostCookieName(code));
  if (hostToken && await verifyHost(code, hostToken)) return "host";

  const playerToken = getCookie(request, playerCookieName(code));
  if (playerToken && await verifyPlayer(code, playerToken)) return "player";

  return null;
}
