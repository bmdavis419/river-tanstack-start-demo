import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import z from "zod";

const getSessionPassword = createServerOnlyFn(() => {
  const password = process.env.SESSION_PASSWORD;
  if (!password) {
    throw new Error("SESSION_PASSWORD is not set");
  }
  return password;
});

const getAppPassword = createServerOnlyFn(() => {
  const password = process.env.SECRET_APP_PASSWORD;
  if (!password) {
    throw new Error("SECRET_APP_PASSWORD is not set");
  }
  return password;
});

type SessionData = {
  userSavedPassword?: string;
};

const useAppSession = () =>
  useSession<SessionData>({
    name: "app-session",
    password: getSessionPassword(),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  });

export const checkAuthStatus = createServerOnlyFn(async () => {
  const session = await useAppSession();
  const userSavedPassword = session.data?.userSavedPassword;
  if (!userSavedPassword || userSavedPassword !== getAppPassword()) {
    return {
      isAuthenticated: false,
    };
  }
  return {
    isAuthenticated: true,
  };
});

export const serverCheckAuthStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    return await checkAuthStatus();
  }
);

export const serverLogout = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await useAppSession();
    await session.clear();
    return {
      success: true,
    };
  }
);

export const serverLogin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      password: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const { password } = data;
    if (password !== getAppPassword()) {
      return {
        success: false,
        error: "Invalid password",
      };
    }
    const session = await useAppSession();
    await session.update({
      userSavedPassword: password,
    });
    return {
      success: true,
    };
  });
