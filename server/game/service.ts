import { calculatePoints, isDeadlineExpired } from "../../shared/game-state.ts";
import type {
  GameSession,
  GameState,
  PlayerSession,
} from "../../shared/types.ts";
import { sql } from "../db.ts";
import {
  createCode,
  createToken,
  type GameRow,
  getAnswerCounts,
  getGame,
  getPlayerIdByToken,
  getQuestion,
  getQuestionChoices,
  hasAnsweredQuestion,
} from "./repository.ts";
import { cancelReveal, scheduleReveal } from "./reveal.ts";

export interface StateViewer {
  role?: "host" | "player";
  playerToken?: string;
}

export async function createGame(nickname: string): Promise<GameSession> {
  const [quiz] = await sql<{ id: string }[]>`
    SELECT id FROM quizzes ORDER BY created_at LIMIT 1
  `;
  if (!quiz) throw new Error("Nenhum quiz disponível.");
  const cleanNickname = normalizeNickname(nickname);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = createCode();
    const hostToken = createToken();
    try {
      await sql`
        INSERT INTO games (id, quiz_id, code, host_token, host_nickname, status)
        VALUES (${createToken()}, ${quiz.id}, ${code}, ${hostToken}, ${cleanNickname}, 'lobby')
      `;
      return { code, hostToken };
    } catch (error) {
      if (
        !(error instanceof Error) || !error.message.includes("games_code_key")
      ) {
        throw error;
      }
    }
  }
  throw new Error("Não foi possível gerar o código da sala.");
}

function normalizeNickname(nickname: string): string {
  const clean = nickname.trim().slice(0, 24);
  if (clean.length < 2) throw new Error("Informe um apelido válido.");
  return clean;
}

export async function verifyHost(
  code: string,
  token: string,
): Promise<boolean> {
  const game = await getGame(code);
  return game?.host_token === token;
}

export async function joinGame(
  code: string,
  nickname: string,
): Promise<PlayerSession> {
  const game = await getGame(code);
  if (!game) throw new Error("Sala não encontrada.");
  if (game.status !== "lobby") throw new Error("A partida já começou.");
  const cleanNickname = normalizeNickname(nickname);

  const playerToken = createToken();
  const playerId = createToken();
  await sql.begin(async (transaction) => {
    await transaction`
      INSERT INTO players (id, nickname, player_token)
      VALUES (${playerId}, ${cleanNickname}, ${playerToken})
    `;
    await transaction`
      INSERT INTO game_players (game_id, player_id)
      VALUES (${game.id}, ${playerId})
    `;
  });

  return { code: game.code, playerId, playerToken, nickname: cleanNickname };
}

export async function verifyPlayer(
  code: string,
  playerToken: string,
): Promise<boolean> {
  const rows = await sql<{ id: string }[]>`
    SELECT p.id
    FROM players p
    JOIN game_players gp ON gp.player_id = p.id
    JOIN games g ON g.id = gp.game_id
    WHERE g.code = ${code} AND p.player_token = ${playerToken}
  `;
  return Boolean(rows[0]);
}

export async function getState(
  code: string,
  viewer: StateViewer = {},
): Promise<GameState | null> {
  const game = await getGame(code);
  if (!game) return null;

  if (game.status === "question" && game.question_deadline_at) {
    scheduleReveal(game.id, game.code, game.question_deadline_at);
  }

  const [questionCount] = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count FROM questions WHERE quiz_id = ${game.quiz_id}
  `;
  const players = await sql<{
    id: string;
    nickname: string;
    score: number;
    has_answered: boolean;
  }[]>`
    SELECT p.id, p.nickname, gp.score,
      EXISTS (
        SELECT 1 FROM answers a
        WHERE a.game_id = ${game.id}
          AND a.player_id = p.id
          AND a.question_id = (
            SELECT id FROM questions
            WHERE quiz_id = ${game.quiz_id} AND position = ${game.current_question_position}
          )
      ) AS has_answered
    FROM game_players gp
    JOIN players p ON p.id = gp.player_id
    WHERE gp.game_id = ${game.id}
    ORDER BY gp.score DESC, gp.joined_at
  `;

  let currentQuestion = null;
  if (game.current_question_position > 0) {
    const question = await getQuestion(
      game.quiz_id,
      game.current_question_position,
    );
    if (question) {
      const choices = await getQuestionChoices(question.id);
      const isRevealed = game.status === "reveal" || game.status === "finished";
      const answerCounts = isRevealed
        ? await getAnswerCounts(game.id, question.id)
        : await maybeAnswerCounts(game, question.id, viewer);
      currentQuestion = {
        id: question.id,
        position: question.position,
        prompt: question.prompt,
        durationSeconds: question.duration_seconds,
        choices: choices.map(({ id, label, position }) => ({
          id,
          label,
          position,
        })),
        correctChoiceId: isRevealed
          ? choices.find((choice) => choice.is_correct)?.id ?? null
          : null,
        ...(answerCounts ? { answerCounts } : {}),
      };
    }
  }

  return {
    code: game.code,
    status: game.status,
    hostNickname: game.host_nickname,
    currentQuestion,
    currentQuestionPosition: game.current_question_position,
    totalQuestions: Number(questionCount?.count ?? 0),
    deadlineAt: game.question_deadline_at?.toISOString() ?? null,
    players: players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      score: player.score,
      hasAnswered: player.has_answered,
    })),
  };
}

async function maybeAnswerCounts(
  game: GameRow,
  questionId: string,
  viewer: StateViewer,
): Promise<Record<string, number> | null> {
  if (viewer.role === "host") {
    return await getAnswerCounts(game.id, questionId);
  }
  if (!viewer.playerToken) return null;
  const playerId = await getPlayerIdByToken(game.id, viewer.playerToken);
  if (!playerId || !await hasAnsweredQuestion(game.id, questionId, playerId)) {
    return null;
  }
  return await getAnswerCounts(game.id, questionId);
}

export async function startGame(code: string): Promise<void> {
  const game = await getGame(code);
  if (!game || game.status !== "lobby") {
    throw new Error("A partida não pode começar.");
  }
  const question = await getQuestion(game.quiz_id, 1);
  if (!question) throw new Error("O quiz não possui perguntas.");

  const startedAt = new Date();
  const deadlineAt = new Date(
    startedAt.getTime() + question.duration_seconds * 1000,
  );
  await sql`
    UPDATE games
    SET status = 'question', current_question_position = 1,
      question_started_at = ${startedAt}, question_deadline_at = ${deadlineAt}
    WHERE id = ${game.id} AND status = 'lobby'
  `;
  scheduleReveal(game.id, game.code, deadlineAt);
}

export async function submitAnswer(
  code: string,
  playerToken: string,
  choiceId: string,
): Promise<number> {
  const game = await getGame(code);
  if (!game || game.status !== "question") {
    throw new Error("A pergunta não está aberta.");
  }
  if (!game.question_started_at || !game.question_deadline_at) {
    throw new Error("A pergunta não possui prazo válido.");
  }
  const now = new Date();
  if (isDeadlineExpired(game.question_deadline_at, now)) {
    throw new Error("O tempo acabou.");
  }

  const question = await getQuestion(
    game.quiz_id,
    game.current_question_position,
  );
  if (!question) throw new Error("Pergunta não encontrada.");
  const [player] = await sql<{ id: string }[]>`
    SELECT p.id FROM players p
    JOIN game_players gp ON gp.player_id = p.id
    WHERE gp.game_id = ${game.id} AND p.player_token = ${playerToken}
  `;
  if (!player) throw new Error("Jogador não encontrado.");
  const [choice] = await sql<{
    id: string;
    position: number;
    label: string;
    is_correct: boolean;
  }[]>`
    SELECT id, position, label, is_correct FROM choices
    WHERE id = ${choiceId} AND question_id = ${question.id}
  `;
  if (!choice) throw new Error("Alternativa inválida.");

  const points = choice.is_correct
    ? calculatePoints(question.duration_seconds, game.question_started_at, now)
    : 0;
  const inserted = await sql`
    INSERT INTO answers (game_id, question_id, player_id, choice_id, is_correct, points, answered_at)
    VALUES (${game.id}, ${question.id}, ${player.id}, ${choice.id}, ${choice.is_correct}, ${points}, ${now})
    ON CONFLICT (game_id, question_id, player_id) DO NOTHING
    RETURNING points
  `;
  if (inserted.count !== 1) throw new Error("Você já respondeu esta pergunta.");

  return points;
}

export async function advanceGame(code: string): Promise<void> {
  const game = await getGame(code);
  if (!game) throw new Error("Sala não encontrada.");

  if (game.status === "question") {
    throw new Error("Aguarde o tempo da pergunta terminar.");
  }
  if (game.status !== "reveal") throw new Error("A partida não pode avançar.");

  const nextPosition = game.current_question_position + 1;
  const nextQuestion = await getQuestion(game.quiz_id, nextPosition);
  if (!nextQuestion) {
    cancelReveal(game.id);
    await sql`UPDATE games SET status = 'finished', question_deadline_at = NULL WHERE id = ${game.id}`;
    return;
  }

  const startedAt = new Date();
  const deadlineAt = new Date(
    startedAt.getTime() + nextQuestion.duration_seconds * 1000,
  );
  const updated = await sql`
    UPDATE games
    SET status = 'question', current_question_position = ${nextPosition},
      question_started_at = ${startedAt}, question_deadline_at = ${deadlineAt}
    WHERE id = ${game.id} AND status = 'reveal'
    RETURNING id
  `;
  if (updated.count !== 1) throw new Error("A partida não pode avançar.");
  scheduleReveal(game.id, game.code, deadlineAt);
}

export async function finishGame(code: string): Promise<void> {
  const game = await getGame(code);
  if (!game) throw new Error("Sala não encontrada.");
  if (game.status !== "question" && game.status !== "reveal") {
    throw new Error("O quiz não está em andamento.");
  }
  cancelReveal(game.id);
  await sql`
    UPDATE games
    SET status = 'finished', question_deadline_at = NULL
    WHERE id = ${game.id} AND status IN ('question', 'reveal')
  `;
}

export async function restartGame(code: string): Promise<void> {
  const game = await getGame(code);
  if (!game) throw new Error("Sala não encontrada.");
  if (game.status !== "finished") {
    throw new Error("A partida ainda não terminou.");
  }
  cancelReveal(game.id);
  await sql.begin(async (transaction) => {
    await transaction`DELETE FROM answers WHERE game_id = ${game.id}`;
    await transaction`
      UPDATE game_players SET score = 0 WHERE game_id = ${game.id}
    `;
    const updated = await transaction`
      UPDATE games
      SET status = 'lobby', current_question_position = 0,
        question_started_at = NULL, question_deadline_at = NULL
      WHERE id = ${game.id} AND status = 'finished'
      RETURNING id
    `;
    if (updated.count !== 1) throw new Error("A partida não pode reiniciar.");
  });
}
