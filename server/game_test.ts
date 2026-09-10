import { assert, assertEquals, assertRejects } from "@std/assert";
import type { GameState, PlayerSession } from "../shared/types.ts";
import { sql } from "./db.ts";
import {
  advanceGame,
  cancelPendingReveal,
  createGame,
  getState,
  joinGame,
  revealCurrentQuestion,
  startGame,
  submitAnswer,
} from "./game.ts";

async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

const databaseUp = await isDatabaseAvailable();

async function ensureSchemaAndSeed(): Promise<void> {
  const tables = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count
    FROM pg_class
    WHERE relname = 'quizzes' AND relkind = 'r'
  `;
  if (tables[0].count === 0) {
    const migration = await Deno.readTextFile(
      new URL("../db/migrations/001_initial.sql", import.meta.url),
    );
    await sql.unsafe(migration);
  }
  const quizzes = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count FROM quizzes WHERE id = 'web-basics'
  `;
  if (quizzes[0].count === 0) {
    const seed = await Deno.readTextFile(
      new URL("../db/seed/001_web_basics.sql", import.meta.url),
    );
    await sql.unsafe(seed);
  }
}

interface Fixture {
  code: string;
  players: PlayerSession[];
}

async function fixture(): Promise<Fixture> {
  await ensureSchemaAndSeed();
  const session = await createGame("Host Test");
  return { code: session.code, players: [] };
}

async function addPlayer(fixture: Fixture, nickname: string): Promise<void> {
  const player = await joinGame(fixture.code, nickname);
  fixture.players.push(player);
}

async function cleanup(fixture: Fixture): Promise<void> {
  await cancelPendingReveal(fixture.code);
  await sql`DELETE FROM games WHERE code = ${fixture.code}`;
  const tokens = fixture.players.map((player) => player.playerToken);
  if (tokens.length > 0) {
    await sql`DELETE FROM players WHERE player_token = ANY(${tokens})`;
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function runScenario(
  fn: (fixture: Fixture) => Promise<void>,
): Promise<void> {
  const game = await fixture();
  try {
    await fn(game);
  } finally {
    await cleanup(game);
  }
}

function firstChoiceId(state: GameState): string {
  const choices = state.currentQuestion?.choices ?? [];
  if (choices.length === 0) throw new Error("Sem alternativas disponíveis.");
  return choices[0].id;
}

const dbTestOptions = {
  sanitizeOps: false,
  sanitizeResources: false,
};

if (databaseUp) {
  Deno.test(
    "host must provide a nickname to create a game",
    dbTestOptions,
    async () => {
      await ensureSchemaAndSeed();
      await assertRejects(
        () => createGame(""),
        Error,
        "Informe um apelido válido.",
      );
    },
  );

  Deno.test(
    "player receives the question as soon as it starts",
    dbTestOptions,
    async () => {
      await runScenario(async (fx) => {
        await addPlayer(fx, "P1");
        await startGame(fx.code);
        const state = await getState(fx.code, {
          playerToken: fx.players[0].playerToken,
        });
        if (!state) throw new Error("Estado não encontrado.");
        assertEquals(state.status, "question");
        assertEquals(state.hostNickname, "Host Test");
        assertEquals(state.currentQuestionPosition, 1);
        assertCurrentQuestion(state);
        assertEquals(state.currentQuestion?.correctChoiceId, null);
        assertEquals(state.currentQuestion?.answerCounts, undefined);
      });
    },
  );

  Deno.test(
    "answer counts are only exposed to the player who answered during the question",
    dbTestOptions,
    async () => {
      await runScenario(async (fx) => {
        await addPlayer(fx, "Ana");
        await addPlayer(fx, "Bia");
        await startGame(fx.code);
        const answered = fx.players[0];
        const waiting = fx.players[1];
        const choiceId = await firstChoiceId(
          await getState(fx.code, {
            playerToken: answered.playerToken,
          }) as GameState,
        );

        await submitAnswer(fx.code, answered.playerToken, choiceId);

        const answeredState = await getState(fx.code, {
          playerToken: answered.playerToken,
        });
        assertEquals(answeredState?.currentQuestion?.answerCounts, {
          [choiceId]: 1,
        });
        const waitingState = await getState(fx.code, {
          playerToken: waiting.playerToken,
        });
        assertEquals(waitingState?.currentQuestion?.answerCounts, undefined);
        const hostState = await getState(fx.code);
        assertEquals(hostState?.currentQuestion?.answerCounts, undefined);
      });
    },
  );

  Deno.test(
    "reveal exposes the correct answer and counts to every player",
    dbTestOptions,
    async () => {
      await runScenario(async (fx) => {
        await addPlayer(fx, "Ana");
        await addPlayer(fx, "Bia");
        await startGame(fx.code);
        const choiceId = await firstChoiceId(
          await getState(fx.code, {
            playerToken: fx.players[0].playerToken,
          }) as GameState,
        );
        await submitAnswer(fx.code, fx.players[0].playerToken, choiceId);

        await revealCurrentQuestion(fx.code);

        const state = await getState(fx.code);
        if (!state?.currentQuestion) throw new Error("Sem pergunta atual.");
        assertEquals(state.status, "reveal");
        const choiceIds = state.currentQuestion.choices.map((c) => c.id);
        assert(
          choiceIds.includes(state.currentQuestion.correctChoiceId ?? ""),
          "correctChoiceId deve ser uma das alternativas.",
        );
        assertEquals(state.currentQuestion.answerCounts, { [choiceId]: 1 });

        const waitingState = await getState(fx.code, {
          playerToken: fx.players[1].playerToken,
        });
        assertEquals(
          waitingState?.currentQuestion?.answerCounts,
          { [choiceId]: 1 },
        );
      });
    },
  );

  Deno.test(
    "next question resets the answer gating for players who have not answered it",
    dbTestOptions,
    async () => {
      await runScenario(async (fx) => {
        await addPlayer(fx, "Ana");
        await startGame(fx.code);
        const player = fx.players[0];
        const firstChoiceIdValue = await firstChoiceId(
          await getState(fx.code, {
            playerToken: player.playerToken,
          }) as GameState,
        );
        await submitAnswer(fx.code, player.playerToken, firstChoiceIdValue);
        await revealCurrentQuestion(fx.code);
        await advanceGame(fx.code);

        const state = await getState(fx.code, {
          playerToken: player.playerToken,
        });
        if (!state?.currentQuestion) throw new Error("Sem pergunta atual.");
        assertEquals(state.status, "question");
        assertEquals(state.currentQuestionPosition, 2);
        assertEquals(state.currentQuestion.answerCounts, undefined);
      });
    },
  );

  Deno.test(
    "host sees live counts while the question is open",
    dbTestOptions,
    async () => {
      await runScenario(async (fx) => {
        await addPlayer(fx, "Ana");
        await addPlayer(fx, "Bia");
        await startGame(fx.code);
        const answered = fx.players[0];
        const waiting = fx.players[1];
        const choiceId = await firstChoiceId(
          await getState(fx.code, { role: "host" }) as GameState,
        );
        await submitAnswer(fx.code, answered.playerToken, choiceId);

        const hostState = await getState(fx.code, { role: "host" });
        assertEquals(hostState?.currentQuestion?.answerCounts, {
          [choiceId]: 1,
        });
        const waitingState = await getState(fx.code, {
          role: "player",
          playerToken: waiting.playerToken,
        });
        assertEquals(waitingState?.currentQuestion?.answerCounts, undefined);
      });
    },
  );

  Deno.test(
    "host cannot advance to the next question before the timer reveals it",
    dbTestOptions,
    async () => {
      await runScenario(async (fx) => {
        await addPlayer(fx, "Ana");
        await startGame(fx.code);
        await assertRejects(
          () => advanceGame(fx.code),
          Error,
          "Aguarde o tempo da pergunta terminar.",
        );
        const state = await getState(fx.code, { role: "host" });
        assertEquals(state?.status, "question");
      });
    },
  );

  Deno.test(
    "question auto-reveals and scores when the timer expires without a host action",
    dbTestOptions,
    async () => {
      await runScenario(async (fx) => {
        await addPlayer(fx, "Ana");
        const player = fx.players[0];
        await startGame(fx.code);
        const choiceId = await firstChoiceId(
          await getState(fx.code, { role: "host" }) as GameState,
        );
        const points = await submitAnswer(
          fx.code,
          player.playerToken,
          choiceId,
        );
        await sql`
          UPDATE games
          SET question_deadline_at = now() - interval '1 second'
          WHERE code = ${fx.code}
        `;

        let state: GameState | null = null;
        for (let attempt = 0; attempt < 50; attempt++) {
          state = await getState(fx.code);
          if (state?.status === "reveal") break;
          await sleep(50);
        }

        if (!state?.currentQuestion) throw new Error("Sem pergunta atual.");
        assertEquals(state.status, "reveal");
        assertEquals(state.players[0]?.score, points);
        assert(state.currentQuestion.correctChoiceId !== null);
        assertEquals(state.currentQuestion.answerCounts, { [choiceId]: 1 });
      });
    },
  );
}

function assertCurrentQuestion(state: GameState): void {
  assertEquals(state.currentQuestion?.choices.length, 4);
  assertEquals(typeof state.currentQuestion?.prompt, "string");
}
