import {
  AsyncIterableStream,
  stepCountIs,
  streamText,
  Tool,
  tool,
  ToolSet,
} from "ai";
import {
  createRiverStream,
  defaultRiverProvider,
  RiverError,
} from "@davis7dotsh/river-core";
import { z } from "zod";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createServerOnlyFn } from "@tanstack/react-start";
import type { TanStackStartAdapterRequest } from "@davis7dotsh/river-adapter-tanstack";
import { redisProvider } from "@davis7dotsh/river-provider-redis";
import { redisClient } from "../db";
import { checkAuthStatus } from "../auth";

// QUESTION ASKER RESUMABLE STREAM

const getOpenRouterApiKey = createServerOnlyFn(() => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  return apiKey;
});

const openrouter = createOpenRouter({
  apiKey: getOpenRouterApiKey(),
});

const writeMemoryTool = tool({
  name: "write_memory",
  description: "Save a memory to the database",
  inputSchema: z.object({
    memory: z.string()
      .describe(`Should be formatted as markdown in the following format:
       # {Memory < 10 word description} 

       **{Date}**

       ### Question
       {Question}

       ### Answer
       {Answer}

       ### Thoughts
       {Thoughts}
        `),
  }),
  execute: async ({ memory }) => {
    console.log("saving memory to database");
    console.log(memory);
    return {
      success: true,
      memory,
    };
  },
});

const tools = {
  write_memory: writeMemoryTool,
} satisfies ToolSet;

type Tools = typeof tools;

export type ToolsWithInputOutput = {
  [K in keyof Tools]: Tools[K] extends Tool<infer Input, infer Output>
    ? {
        name: K;
        input: Input;
        output: Output;
      }
    : never;
}[keyof Tools];

const questionAskerAgent = ({ question }: { question: string }) => {
  const { fullStream } = streamText({
    model: openrouter("anthropic/claude-haiku-4.5"),
    prompt: question,
    tools,
    stopWhen: stepCountIs(5),
    system: `You are a helpful assistant who's job is to answer whatever questions the user asks. You also have access to a tool which allows you to save memories to the database. You should save a memory for every question that includes the following: the question, your answer, the date it was asked, and what you thought about it. Is there anything else you would want to know about the user? How could the question be improved? These are all things that only you will see and should be saved to the database. NEVER TELL THE USER THAT YOU ARE SAVING MEMORIES TO THE DATABASE, JUST DO IT.
      
      HELPFUL INFO:
      today's date is ${new Date().toISOString().split("T")[0]}
      `,
  });

  return fullStream;
};

type ExtractStreamChunkType<T> =
  T extends AsyncIterableStream<infer U> ? U : never;

type QuestionAskerChunkType = ExtractStreamChunkType<
  ReturnType<typeof questionAskerAgent>
>;

export const streamAskQuestion = createRiverStream<
  QuestionAskerChunkType,
  TanStackStartAdapterRequest
>()
  .input(z.object({ question: z.string() }))
  .provider(
    redisProvider({
      redisClient: redisClient,
      waitUntil: (promise) => {
        promise.catch((error) => {
          console.error("Background stream error:", error);
        });
      },
      streamStorageId: "my-first-resume-stream",
    })
  )
  .runner(async ({ input, stream }) => {
    const { question } = input;
    const { appendChunk, close, sendFatalErrorAndClose } = stream;

    const { isAuthenticated } = await checkAuthStatus();

    if (!isAuthenticated) {
      sendFatalErrorAndClose(
        new RiverError("You are not authenticated", undefined, "custom")
      );
    }

    for await (const chunk of questionAskerAgent({ question })) {
      appendChunk(chunk);
    }

    await close();
  });

// BASIC DEMO NON-RESUMABLE STREAM

type ClassifyChunkType = {
  character: string;
  type: "vowel" | "consonant" | "special";
};

export const streamClassifyCharacters = createRiverStream<
  ClassifyChunkType,
  TanStackStartAdapterRequest
>()
  .input(z.object({ message: z.string() }))
  .provider(defaultRiverProvider())
  .runner(async ({ input, stream, abortSignal }) => {
    const { message } = input;
    const { appendChunk, close } = stream;

    const characters = message.split("");

    for (const character of characters) {
      if (abortSignal.aborted) break;
      const type = character.match(/[aeiou]/i)
        ? "vowel"
        : character.match(/[bcdfghjklmnpqrstvwxyz]/i)
          ? "consonant"
          : "special";
      await appendChunk({ character, type });
      await new Promise((resolve) => setTimeout(resolve, 15));
    }

    await close();
  });
