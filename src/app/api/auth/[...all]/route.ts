import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Handler HTTP que expõe todos os endpoints do BetterAuth:
// POST /api/auth/sign-in/email
// POST /api/auth/sign-up/email
// POST /api/auth/sign-out
// GET  /api/auth/session
// etc.
export const { GET, POST } = toNextJsHandler(auth);
