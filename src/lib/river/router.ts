import { createRiverRouter } from "@davis7dotsh/river-core";
import { streamAskQuestion, streamClassifyCharacters } from "./streams";

export const myRiverRouter = createRiverRouter({
  askQuestion: streamAskQuestion,
  classifyCharacters: streamClassifyCharacters,
});

export type MyRiverRouter = typeof myRiverRouter;
