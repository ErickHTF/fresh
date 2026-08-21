import { assertEquals, assertNotEquals } from "jsr:@std/assert@^1.0.0";
import { shuffleChoices } from "./shuffle.ts";
import type { Choice } from "./types.ts";

const choices: Choice[] = [
  { id: "a", label: "A", position: 1 },
  { id: "b", label: "B", position: 2 },
  { id: "c", label: "C", position: 3 },
  { id: "d", label: "D", position: 4 },
];

Deno.test("keeps the same order for the same player and question", () => {
  const first = shuffleChoices(choices, "player-1:question-1");
  const second = shuffleChoices(choices, "player-1:question-1");

  assertEquals(first, second);
});

Deno.test("usually produces a different order for different players", () => {
  const first = shuffleChoices(choices, "player-1:question-1");
  const second = shuffleChoices(choices, "player-2:question-1");

  assertNotEquals(
    first.map((choice) => choice.id),
    second.map((choice) => choice.id),
  );
});

Deno.test("keeps choice ids and assigns visual positions", () => {
  const shuffled = shuffleChoices(choices, "player-1:question-1");

  assertEquals(
    shuffled.map((choice) => choice.id).sort(),
    ["a", "b", "c", "d"],
  );
  assertEquals(
    shuffled.map((choice) => choice.position).sort(),
    [1, 2, 3, 4],
  );
});
