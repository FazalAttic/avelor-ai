import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Next only reads env files from this app directory; the fallback keeps a
  // fresh checkout working without one (API default port, see .env.example).
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:5000",
});

export const { useSession } = authClient;
