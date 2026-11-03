
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/tc/common";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Project TimeCapsule" },
      {
        name: "description",
        content: "Set a new password for your private archive.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [checking, setChecking] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;

      setValidSession(!error && !!data.session);
      setChecking(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      if (session) {
        setValidSession(true);
        setChecking(false);
      }
    });

    void checkSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update your password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <Logo size={40} />
          <div>
            <div className="font-display font-semibold">
              Project TimeCapsule
            </div>
            <div className="text-xs italic text-muted-foreground">
              Save today. Rediscover tomorrow.
            </div>
          </div>
        </div>

        {checking ? (
          <div className="py-10 text-center">
            <Loader2 className="mx-auto size-6 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">
              Verifying your reset link...
            </p>
          </div>
        ) : success ? (
          <div className="space-y-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="size-6 text-primary" />
            </div>

            <h1 className="font-display text-2xl font-semibold">
              Password updated!
            </h1>

            <p className="text-sm text-muted-foreground">
              Your password has been changed successfully. You can now
              continue to your private archive.
            </p>

            <Button
              className="w-full"
              onClick={() => navigate({ to: "/" })}
            >
              Continue to your archive
            </Button>
          </div>
        ) : !validSession ? (
          <div className="space-y-4">
            <h1 className="font-display text-2xl font-semibold">
              Reset link unavailable
            </h1>

            <p className="text-sm text-muted-foreground">
              This password reset link is invalid, expired, or has already
              been used. Request a new reset link to continue.
            </p>

            <Button
              className="w-full"
              onClick={() => navigate({ to: "/login" })}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold">
              Create a new password
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Choose a new password for your account.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    required
                    minLength={6}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-2.5 text-muted-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">
                  Confirm new password
                </Label>

                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                    required
                    minLength={6}
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute right-3 top-2.5 text-muted-foreground"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading && <Loader2 className="animate-spin" />}
                {loading ? "Updating password..." : "Update password"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
