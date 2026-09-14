export function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader.split(";").find((item) => {
    return item.trim().startsWith(`${name}=`);
  });
  return cookie?.trim().slice(name.length + 1);
}

export function setSessionCookie(
  headers: Headers,
  name: string,
  value: string,
): void {
  headers.append(
    "Set-Cookie",
    `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
  );
}

export function hostCookieName(code: string): string {
  return `fresh_host_${code}`;
}

export function playerCookieName(code: string): string {
  return `fresh_player_${code}`;
}

export function nicknameCookieName(code: string): string {
  return `fresh_nickname_${code}`;
}

export function playerIdCookieName(code: string): string {
  return `fresh_player_id_${code}`;
}

export function clearSessionCookies(headers: Headers, code: string): void {
  const names = [
    hostCookieName(code),
    playerCookieName(code),
    nicknameCookieName(code),
    playerIdCookieName(code),
  ];
  for (const name of names) {
    headers.append(
      "Set-Cookie",
      `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    );
  }
}
