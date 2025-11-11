import { myRiverClient } from "@/lib/river/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/basic/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-screen flex flex-col p-6">
      <BasicDemo />
    </div>
  );
}

const BasicDemo = () => {
  const [message, setMessage] = useState(
    "Why is TypeScript a better language than Go?"
  );
  const trimmedMessage = message.trim();

  const [vowelCount, setVowelCount] = useState(0);
  const [consonantCount, setConsonantCount] = useState(0);
  const [specialCount, setSpecialCount] = useState(0);

  const [status, setStatus] = useState<
    "idle" | "running" | "success" | "error" | "aborted"
  >("idle");

  const { start } = myRiverClient.classifyCharacters.useStream({
    onStart: () => {
      setStatus("running");
      setVowelCount(0);
      setConsonantCount(0);
      setSpecialCount(0);
    },
    onChunk: (chunk) => {
      switch (chunk.type) {
        case "vowel":
          setVowelCount((prev) => prev + 1);
          break;
        case "consonant":
          setConsonantCount((prev) => prev + 1);
          break;
        case "special":
          setSpecialCount((prev) => prev + 1);
          break;
      }
    },
    onError: (error) => {
      console.warn(error);
    },
    onFatalError: (error) => {
      setStatus("error");
      console.error(error);
    },
    onAbort: () => {
      setStatus("aborted");
    },
    onSuccess: () => {
      setStatus("success");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    start({ message: trimmedMessage });
  };

  const handleClear = () => {
    setMessage("");
    setVowelCount(0);
    setConsonantCount(0);
    setSpecialCount(0);
    setStatus("idle");
  };

  const hasResults = vowelCount > 0 || consonantCount > 0 || specialCount > 0;
  const hasContent = trimmedMessage.length > 0;
  const showClear = hasResults || hasContent;

  return (
    <>
      <Link
        to="/login"
        className="fixed top-4 right-4 px-4 py-2 bg-neutral-700 text-white rounded-lg font-medium hover:bg-neutral-600 transition-colors z-10"
      >
        Other Examples
      </Link>
      <div className="max-w-2xl mx-auto w-full space-y-6 p-6 pt-20">
        <h1 className="text-3xl font-bold text-white mb-6">
          Character Classifier
        </h1>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-neutral-800 rounded-lg p-4">
            <div className="text-sm font-medium text-neutral-400 mb-1">
              Vowels
            </div>
            <div className="text-3xl font-bold text-white">{vowelCount}</div>
          </div>
          <div className="bg-neutral-800 rounded-lg p-4">
            <div className="text-sm font-medium text-neutral-400 mb-1">
              Consonants
            </div>
            <div className="text-3xl font-bold text-white">
              {consonantCount}
            </div>
          </div>
          <div className="bg-neutral-800 rounded-lg p-4">
            <div className="text-sm font-medium text-neutral-400 mb-1">
              Special
            </div>
            <div className="text-3xl font-bold text-white">{specialCount}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={status === "running"}
              rows={4}
              className="w-full px-4 py-3 bg-neutral-800 text-white border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              placeholder="Enter your message here..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={status === "running" || !trimmedMessage}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === "running" ? "Processing..." : "Submit"}
            </button>

            {showClear && status !== "running" && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 bg-neutral-700 text-white rounded-lg font-medium hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {status === "error" && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-300">
              An error occurred while processing. Please try again.
            </div>
          )}

          {status === "aborted" && (
            <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg text-sm text-yellow-300">
              Processing was cancelled.
            </div>
          )}
        </form>
      </div>
    </>
  );
};
