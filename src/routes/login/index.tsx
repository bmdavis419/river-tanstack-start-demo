import { serverCheckAuthStatus, serverLogin } from "@/lib/auth";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login/")({
  beforeLoad: async () => {
    const { isAuthenticated } = await serverCheckAuthStatus();
    if (isAuthenticated) {
      throw redirect({
        to: "/",
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!password.trim()) return;

    setIsLoading(true);
    setError("");

    const result = await serverLogin({
      data: {
        password: password,
      },
    });

    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
    } else {
      window.location.href = "/";
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center flex-col justify-center bg-neutral-900 p-6 gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-neutral-300 text-lg max-w-lg">
          The resuming stream demo is locked behind a password since it hit's an
          LLM endpoint and a DB. If you want to try it,{" "}
          <a
            href="https://github.com/bmdavis419/river-demos/tree/main/tanstack-start-demo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
          >
            check out the repo
          </a>
          !
        </p>
        <p className="text-neutral-200 text-lg">
          If you do want to try a basic demo,{" "}
          <Link to="/basic" className="text-blue-500 hover:text-blue-600">
            click here
          </Link>
          !
        </p>
      </div>
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-300 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full bg-neutral-800 text-white border border-neutral-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter password"
              autoFocus
            />
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={!password.trim() || isLoading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
