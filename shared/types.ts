export type GameStatus = "lobby" | "question" | "reveal" | "finished";

export interface Choice {
  id: string;
  label: string;
  position: number;
}

export interface CurrentQuestion {
  id: string;
  position: number;
  prompt: string;
  durationSeconds: number;
  choices: Choice[];
  correctChoiceId: string | null;
}

export interface PlayerSummary {
  id: string;
  nickname: string;
  score: number;
  hasAnswered: boolean;
}

export interface GameState {
  code: string;
  status: GameStatus;
  currentQuestion: CurrentQuestion | null;
  currentQuestionPosition: number;
  totalQuestions: number;
  deadlineAt: string | null;
  players: PlayerSummary[];
}

export interface GameSession {
  code: string;
  hostToken: string;
}

export interface PlayerSession {
  code: string;
  playerId: string;
  playerToken: string;
  nickname: string;
}
