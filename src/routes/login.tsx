
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/tc/common";
import { auth } from "@/services/auth";


export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Project TimeCapsule" },
      { name: "description", content: "Sign in to your private project archive." },
      { property: "og:title", content: "Sign in — Project TimeCapsule" },
      { property: "og:description", content: "Save today. Rediscover tomorrow." },
    ],
  }),
  component: LoginPage,
});

type Mode = "signin" | "signup" | "forgot";

function LoginPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    name?: string;
    form?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setErrors({});
    setMessage("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs: typeof errors = {};

    if (!email.trim()) {
      errs.email = "Enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Enter a valid email address.";
    }

    if (mode === "signup" && !displayName.trim()) {
      errs.name = "Enter your name.";
    }

    if (mode !== "forgot" && !password) {
      errs.password = "Enter your password.";
    } else if (mode !== "forgot" && password.length < 6) {
      errs.password = "Password must be at least 6 characters.";
    }

    setErrors(errs);

    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setMessage("");

    try {
      if (mode === "signin") {
  await auth.signIn(email, password, true);
  navigate({ to: "/" });
}

      if (mode === "signup") {
        const result = await auth.signUp(
          email,
          password,
          displayName,
        );

        if (result.needsEmailConfirmation) {
          setMessage(
            "Account created! Check your email and click the confirmation link before signing in.",
          );
        } else {
          navigate({ to: "/" });
        }
      }

      if (mode === "forgot") {
        await auth.resetPassword(email);
        setMessage(
          "If an account exists for this email, a password reset link has been sent. Check your inbox.",
        );
      }
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const heading =
    mode === "signin"
      ? "Welcome back"
      : mode === "signup"
        ? "Create your account"
        : "Reset your password";

  const description =
    mode === "signin"
      ? "Sign in to open your workspace."
      : mode === "signup"
        ? "Create your private Project TimeCapsule account."
        : "Enter the email linked to your account.";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-brand p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <span className="font-display text-xl font-semibold">
            Project TimeCapsule
          </span>
        </div>

        <div className="max-w-md">
          <p className="font-display text-4xl font-semibold leading-tight">
            Save today.
            <br />
            Rediscover tomorrow.
          </p>
          <p className="mt-4 opacity-85">
            Your projects, ideas, decisions and exact stopping points —
            preserved so you can return after months and know exactly
            where you left off.
          </p>
        </div>

        <p className="text-xs opacity-70">
          A private archive. Not a portfolio, not a team tracker.
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size={36} />
            <div>
              <div className="font-display font-semibold">
                Project TimeCapsule
              </div>
              <div className="text-xs italic text-muted-foreground">
                Save today. Rediscover tomorrow.
              </div>
            </div>
          </div>

          <h1 className="font-display text-2xl font-semibold">{heading}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>

          <div className="mt-5 flex gap-2 rounded-lg tone-info px-3 py-2 text-xs">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              Your account is protected by Supabase authentication.
              Your private archive is securely connected to your Supabase account.
            </span>
          </div>

          {message ? (
            <div className="mt-6 space-y-4">
              <p
                className="rounded-lg tone-info px-3 py-3 text-sm"
                role="status"
              >
                {message}
              </p>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => changeMode("signin")}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">Full name</Label>
                  <Input
                    id="displayName"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-err" : undefined}
                />
                {errors.email && (
                  <p id="email-err" className="text-xs text-destructive">
                    {errors.email}
                  </p>
                )}
              </div>

              {mode !== "forgot" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>

                    {mode === "signin" && (
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => changeMode("forgot")}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Input
                      id="password"
                      type={show ? "text" : "password"}
                      autoComplete={
                        mode === "signup" ? "new-password" : "current-password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={!!errors.password}
                      className="pr-10"
                    />

                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                      aria-label={show ? "Hide password" : "Show password"}
                    >
                      {show ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>

                  {errors.password && (
                    <p className="text-xs text-destructive">
                      {errors.password}
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Your session will be remembered on this browser.
              </p>

              {errors.form && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.form}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                {loading
                  ? "Please wait…"
                  : mode === "signin"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : "Send reset link"}
              </Button>

              {mode === "forgot" && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => changeMode("signin")}
                >
                  Back to sign in
                </Button>
              )}

              {mode !== "forgot" && (
                <p className="text-center text-sm text-muted-foreground">
                  {mode === "signin"
                    ? "Don't have an account?"
                    : "Already have an account?"}{" "}
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() =>
                      changeMode(mode === "signin" ? "signup" : "signin")
                    }
                  >
                    {mode === "signin" ? "Create account" : "Sign in"}
                  </button>
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
