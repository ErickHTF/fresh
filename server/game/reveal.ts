import { sql } from "../db.ts";
import { notify } from "../events.ts";
import { getGame } from "./repository.ts";

const revealTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleReveal(
  gameId: string,
  code: string,
  deadlineAt: Date,
): void {
  const previous = revealTimers.get(gameId);
  if (previous) clearTimeout(previous);
  const delay = Math.max(0, deadlineAt.getTime() - Date.now());
  const timer = setTimeout(async () => {
    revealTimers.delete(gameId);
    try {
      await revealCurrentQuestion(code);
      await notify(code);
    } catch {
      // A partida pode ter mudado entre o agendamento e a execução.
    }
  }, delay);
  revealTimers.set(gameId, timer);
}

export function cancelReveal(gameId: string): void {
  const previous = revealTimers.get(gameId);
  if (previous) clearTimeout(previous);
  revealTimers.delete(gameId);
}

export async function cancelPendingReveal(code: string): Promise<void> {
  const game = await getGame(code);
  if (game) cancelReveal(game.id);
}

export async function revealCurrentQuestion(code: string): Promise<void> {
  const game = await getGame(code);
  if (!game || game.status !== "question") return;
  cancelReveal(game.id);
  await sql.begin(async (transaction) => {
    const updated = await transaction`
      UPDATE games
      SET status = 'reveal'
      WHERE id = ${game.id} AND status = 'question'
      RETURNING id
    `;
    if (updated.count !== 1) return;
    await transaction`
      UPDATE game_players gp
      SET score = gp.score + COALESCE((
        SELECT SUM(a.points)
        FROM answers a
        WHERE a.game_id = ${game.id}
          AND a.player_id = gp.player_id
          AND a.question_id = (
            SELECT id
            FROM questions
            WHERE quiz_id = ${game.quiz_id}
              AND position = ${game.current_question_position}
          )
      ), 0)
      WHERE gp.game_id = ${game.id}
    `;
  });
}
