import { define } from "../../../../utils.ts";
import { authorize } from "../../../../server/auth.ts";
import { subscribe } from "../../../../server/events.ts";
import { getState } from "../../../../server/game.ts";

const encoder = new TextEncoder();

export const handler = define.handlers({
  async GET(ctx) {
    if (!await authorize(ctx.req, ctx.params.code)) {
      return new Response("Não autorizado.", { status: 401 });
    }
    const state = await getState(ctx.params.code);
    if (!state) return new Response("Sala não encontrada.", { status: 404 });

    let unsubscribe: (() => void) | undefined;
    let heartbeat: number | undefined;
    const stream = new ReadableStream({
      start(controller) {
        const sendState = async () => {
          const currentState = await getState(ctx.params.code);
          if (currentState) {
            controller.enqueue(
              encoder.encode(
                `event: state\ndata: ${JSON.stringify(currentState)}\n\n`,
              ),
            );
          }
        };
        unsubscribe = subscribe(ctx.params.code, () => void sendState());
        void sendState();
        heartbeat = setInterval(
          () => controller.enqueue(encoder.encode(": ping\n\n")),
          15000,
        );
      },
      cancel() {
        unsubscribe?.();
        if (heartbeat) clearInterval(heartbeat);
      },
    });

    return new Response(stream, {
      headers: {
        "cache-control": "no-cache",
        "connection": "keep-alive",
        "content-type": "text/event-stream",
      },
    });
  },
});
