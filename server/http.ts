export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function body<T>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    throw new Error("JSON inválido.");
  }
}

export function errorResponse(error: unknown): Response {
  const message = error instanceof Error && error.message
    ? error.message
    : "Erro inesperado.";
  return json({ error: message }, 400);
}
