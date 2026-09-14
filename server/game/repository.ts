import type { GameStatus } from "../../shared/types.ts";
import { sql } from "../db.ts";

export interface GameRow {
  id: string;
  quiz_id: string;
  code: string;
  host_token: string;
  host_nickname: string | null;
  status: GameStatus;
  current_question_position: number;
  question_started_at: Date | null;
  question_deadline_at: Date | null;
}

export interface QuestionRow {
  id: string;
  position: number;
  prompt: string;
  duration_seconds: number;
}

export interface ChoiceRow {
  id: string;
  position: number;
  label: string;
  is_correct: boolean;
}

export function createToken(): string {
  return crypto.randomUUID();
}

const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => codeAlphabet[byte % codeAlphabet.length])
    .join("");
}

export async function getGame(code: string): Promise<GameRow | null> {
  const rows = await sql<GameRow[]>`
    SELECT id, quiz_id, code, host_token, host_nickname, status,
      current_question_position, question_started_at, question_deadline_at
    FROM games
    WHERE code = ${code}
  `;
  return rows[0] ?? null;
}

export async function getQuestion(
  quizId: string,
  position: number,
): Promise<QuestionRow | null> {
  const rows = await sql<QuestionRow[]>`
    SELECT id, position, prompt, duration_seconds
    FROM questions
    WHERE quiz_id = ${quizId} AND position = ${position}
  `;
  return rows[0] ?? null;
}

export async function getQuestionChoices(
  questionId: string,
): Promise<ChoiceRow[]> {
  return await sql<ChoiceRow[]>`
    SELECT id, position, label, is_correct
    FROM choices
    WHERE question_id = ${questionId}
    ORDER BY position
  `;
}

export async function getPlayerIdByToken(
  gameId: string,
  playerToken: string,
): Promise<string | null> {
  const rows = await sql<{ id: string }[]>`
    SELECT p.id
    FROM players p
    JOIN game_players gp ON gp.player_id = p.id
    WHERE gp.game_id = ${gameId} AND p.player_token = ${playerToken}
  `;
  return rows[0]?.id ?? null;
}

export async function hasAnsweredQuestion(
  gameId: string,
  questionId: string,
  playerId: string,
): Promise<boolean> {
  const rows = await sql<{ answered: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM answers
      WHERE game_id = ${gameId} AND question_id = ${questionId}
        AND player_id = ${playerId}
    ) AS answered
  `;
  return rows[0]?.answered ?? false;
}

export async function getAnswerCounts(
  gameId: string,
  questionId: string,
): Promise<Record<string, number>> {
  const rows = await sql<{ choice_id: string; count: number }[]>`
    SELECT choice_id, count(*)::int AS count
    FROM answers
    WHERE game_id = ${gameId} AND question_id = ${questionId}
    GROUP BY choice_id
  `;
  return Object.fromEntries(rows.map((row) => [row.choice_id, row.count]));
}
