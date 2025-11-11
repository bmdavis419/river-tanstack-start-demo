import { useEffect, useRef, useState } from "react";
import { myRiverClient } from "@/lib/river/client";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import Markdown from "react-markdown";
import { createStandardSchemaV1, parseAsString, useQueryStates } from "nuqs";
import { ToolsWithInputOutput } from "@/lib/river/streams";
import { serverCheckAuthStatus, serverLogout } from "@/lib/auth";

const searchParams = {
  resumeKey: parseAsString.withDefault(""),
};

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { isAuthenticated } = await serverCheckAuthStatus();
    if (!isAuthenticated) {
      throw redirect({
        to: "/login",
      });
    }
  },
  component: App,
  validateSearch: createStandardSchemaV1(searchParams, {
    partialOutput: true,
  }),
});

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <QuestionAskerDemo />
    </div>
  );
}

type QuestionConversationDisplay =
  | {
      role: "user";
      content: string;
    }
  | {
      role: "assistant";
      id: string;
      content: string;
    }
  | {
      role: "tool";
      id: string;
      tool: ToolsWithInputOutput | null;
    };

const QuestionAskerDemo = () => {
  const [question, setQuestion] = useState("");
  const trimmedQuestion = question.trim();
  const [conversation, setConversation] = useState<
    QuestionConversationDisplay[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useQueryStates(searchParams);
  const hasMounted = useRef(false);

  const questionCaller = myRiverClient.askQuestion.useStream({
    onChunk: (chunk) => {
      console.log("chunk", chunk);
      if (chunk.type === "text-start") {
        setConversation((prev) => [
          ...prev,
          {
            role: "assistant",
            id: chunk.id,
            content: "",
          },
        ]);
      }

      if (chunk.type === "text-delta") {
        setConversation((prev) => {
          const existingAssistant = prev.find(
            (c) => c.role === "assistant" && c.id === chunk.id
          );
          if (existingAssistant && existingAssistant.role === "assistant") {
            const newContent = existingAssistant.content + chunk.text;
            return prev.map((c) =>
              c.role === "assistant" && c.id === chunk.id
                ? { ...c, content: newContent }
                : c
            );
          }
          return prev;
        });
      }

      if (chunk.type === "tool-input-start") {
        setConversation((prev) => [
          ...prev,
          {
            role: "tool",
            id: chunk.id,
            tool: null,
          },
        ]);
      }

      if (chunk.type === "tool-result" && !chunk.dynamic) {
        setConversation((prev) => {
          const existingTool = prev.find(
            (c) => c.role === "tool" && c.id === chunk.toolCallId
          );
          if (existingTool && existingTool.role === "tool") {
            return prev.map((c) =>
              c.role === "tool" && c.id === chunk.toolCallId
                ? {
                    ...c,
                    tool: {
                      name: chunk.toolName,
                      input: chunk.input,
                      output: chunk.output,
                    },
                  }
                : c
            );
          }
          return prev;
        });
      }
    },
    onError: (error) => {
      console.error(error);
      setIsLoading(false);
    },
    onSuccess: () => {
      console.log("success");
      setIsLoading(false);
    },
    onStart: () => {
      console.log("start");
      setIsLoading(true);
    },
    onFatalError: (error) => {
      console.error(error);
      setIsLoading(false);
    },
    onInfo: (info) => {
      if (info.encodedResumptionToken) {
        setQuery({ resumeKey: info.encodedResumptionToken });
      }
    },
  });

  useEffect(() => {
    if (query.resumeKey && !hasMounted.current) {
      questionCaller.resume(query.resumeKey);
    }
    hasMounted.current = true;
  }, [query.resumeKey, hasMounted.current]);

  const handleAsk = async () => {
    if (!trimmedQuestion || isLoading) return;
    handleClear();
    setConversation((prev) => [
      ...prev,
      {
        role: "user",
        content: trimmedQuestion,
      },
    ]);
    setQuestion("");
    await questionCaller.start({
      question: trimmedQuestion,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const handleClear = () => {
    setConversation([]);
    setQuestion("");
    setQuery({ resumeKey: "" });
  };

  const handleLogout = async () => {
    const result = await serverLogout();
    if (result.success) {
      window.location.href = "/login";
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="fixed top-4 right-4 flex items-center gap-3">
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-neutral-700 text-white rounded-lg font-medium hover:bg-neutral-600 transition-colors z-10"
        >
          Logout
        </button>
        <Link
          to="/basic"
          className="px-4 py-2 bg-neutral-700 text-white rounded-lg font-medium hover:bg-neutral-600 transition-colors z-10"
        >
          Other Examples
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-6 pb-32">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-white">
            Question Asker Demo
          </h1>
          {conversation.map((message, index) => {
            if (message.role === "user") {
              return (
                <div key={index} className="mb-6">
                  <div className="border-neutral-800 rounded-lg p-6 border-2">
                    <p className="text-neutral-100 whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              );
            }
            if (message.role === "assistant") {
              return (
                <div key={message.id} className="mb-6">
                  <div className="bg-neutral-800 rounded-lg p-6 prose prose-invert max-w-none">
                    {message.content ? (
                      <Markdown>{message.content}</Markdown>
                    ) : (
                      <div className="text-neutral-400 italic">Thinking...</div>
                    )}
                  </div>
                </div>
              );
            }
            if (message.role === "tool") {
              if (!message.tool)
                return (
                  <div key={message.id} className="mb-6">
                    <div className="bg-neutral-800 rounded-lg p-6">
                      <p className="text-neutral-100 whitespace-pre-wrap">
                        Tool call received. Waiting for result...
                      </p>
                    </div>
                  </div>
                );
              const isWriteMemory = message.tool.name === "write_memory";
              const memoryInput =
                isWriteMemory &&
                typeof message.tool.input === "object" &&
                message.tool.input !== null &&
                "memory" in message.tool.input &&
                typeof message.tool.input.memory === "string"
                  ? message.tool.input.memory
                  : null;

              return (
                <div key={message.id} className="mb-6">
                  <div className="bg-neutral-700 rounded-lg p-4 border border-neutral-600">
                    <div className="text-sm text-neutral-300 mb-2">
                      <span className="font-semibold">Tool:</span>{" "}
                      {message.tool.name}
                    </div>
                    <details className="text-sm">
                      <summary className="text-neutral-400 cursor-pointer hover:text-neutral-300">
                        View details
                      </summary>
                      <div className="mt-2 space-y-2">
                        {isWriteMemory && memoryInput ? (
                          <div>
                            <span className="text-neutral-400">Memory:</span>
                            <div className="mt-1 p-2 bg-neutral-800 rounded prose prose-invert prose-sm max-w-none">
                              <Markdown>{memoryInput}</Markdown>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <span className="text-neutral-400">Input:</span>
                              <pre className="text-neutral-200 mt-1 p-2 bg-neutral-800 rounded overflow-x-auto">
                                {JSON.stringify(message.tool.input, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <span className="text-neutral-400">Output:</span>
                              <pre className="text-neutral-200 mt-1 p-2 bg-neutral-800 rounded overflow-x-auto">
                                {JSON.stringify(message.tool.output, null, 2)}
                              </pre>
                            </div>
                          </>
                        )}
                      </div>
                    </details>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-700 p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <textarea
            value={question}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            className="flex-1 bg-neutral-800 text-white border border-neutral-700 rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent overflow-hidden"
            rows={1}
            style={{ minHeight: "48px", maxHeight: "200px" }}
          />
          <button
            onClick={handleAsk}
            disabled={!question.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Asking..." : "Ask"}
          </button>
          <button
            onClick={handleClear}
            disabled={isLoading}
            className="px-6 py-3 bg-neutral-700 text-white rounded-lg font-medium hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};
