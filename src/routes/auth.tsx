import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { btnGold, inputCls } from "@/components/festive";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Organiser Sign In — Raas Mahotsav 2026" },
      { name: "description", content: "Sign in for Raas Mahotsav organisers." },
      { property: "og:title", content: "Organiser Sign In — Raas Mahotsav 2026" },
      { property: "og:description", content: "Organiser access." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const { error } =
        mode === "in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: window.location.origin + "/admin" },
            });
      if (error) throw error;
    } catch (error: unknown) {
      console.error("Organiser authentication failed:", error);
      toast.error(error instanceof Error ? error.message : "Could not sign in. Please try again.");
      return;
    } finally {
      setBusy(false);
    }

    let sessionResult: Awaited<ReturnType<typeof supabase.auth.getSession>> | null = null;
    try {
      sessionResult = await supabase.auth.getSession();
    } catch (error: unknown) {
      console.error("Organiser session check failed:", error);
      toast.error("Could not confirm your sign-in. Please try again.");
      return;
    }
    const { data: sessionData, error: sessionError } = sessionResult;
    if (sessionError) {
      toast.error("Could not confirm your sign-in. Please try again.");
      return;
    }

    const accessToken = sessionData.session?.access_token;

    console.log("AUTH SESSION EXISTS:", !!sessionData.session);
    console.log("AUTH SESSION ERROR:", sessionError);

    // Safe diagnostic: inspect only JWT metadata.
    // The actual access token is never logged.
    let tokenInfo: {
      issuer: string | undefined;
      audience: string | undefined;
      userId: string | undefined;
      expiresAt: string | null;
      error?: string;
    } | null = null;

    if (accessToken) {
      try {
        const parts = accessToken.split(".");

        if (parts.length === 3) {
          const payloadPart = parts[1];

          if (!payloadPart) {
            tokenInfo = {
              issuer: undefined,
              audience: undefined,
              userId: undefined,
              expiresAt: null,
              error: "JWT payload is missing.",
            };
          } else {
            const base64Payload = payloadPart
              .replace(/-/g, "+")
              .replace(/_/g, "/");

            const payload = JSON.parse(atob(base64Payload)) as {
              iss?: string;
              aud?: string;
              sub?: string;
              exp?: number;
            };

            tokenInfo = {
              issuer: payload.iss,
              audience: payload.aud,
              userId: payload.sub,
              expiresAt:
                typeof payload.exp === "number"
                  ? new Date(payload.exp * 1000).toISOString()
                  : null,
            };
          }
        } else {
          tokenInfo = {
            issuer: undefined,
            audience: undefined,
            userId: undefined,
            expiresAt: null,
            error: "Token does not contain three JWT parts.",
          };
        }
      } catch {
        tokenInfo = {
          issuer: undefined,
          audience: undefined,
          userId: undefined,
          expiresAt: null,
          error: "Could not decode token payload.",
        };
      }
    }

    console.log("AUTH TOKEN INFO:", tokenInfo);

    if (mode === "up") {
      toast.success("Check your email to confirm your account.");
      return;
    }

    if (!sessionData.session) {
      toast.error("Login succeeded, but no session was created.");
      console.error("NO AUTH SESSION AFTER LOGIN");
      return;
    }

    console.log("AUTH SESSION EXISTS");
    console.log("AUTH USER:", sessionData.session.user?.email);

    await navigate({ to: "/admin" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="ornate-frame w-full max-w-sm space-y-4 rounded-xl p-6 sm:p-8"
      >
        <Link
          to="/"
          aria-label="Raas Mahotsav home"
          className="block text-center font-display text-xs tracking-[0.2em] text-gold-gradient"
        >
          RAAS MAHOTSAV
        </Link>
        <h1 className="text-center text-xl uppercase text-gold-gradient">
          Organiser {mode === "in" ? "Sign In" : "Sign Up"}
        </h1>

        <label className="block space-y-1 text-sm">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button type="submit" disabled={busy} className={`${btnGold} w-full`}>
          {busy ? "Please wait…" : mode === "in" ? "Sign In" : "Create account"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="w-full text-sm text-muted-foreground"
        >
          {mode === "in"
            ? "Need an account? Sign up"
            : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}