"use client";

import { Suspense } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Heart, Mail, Sparkles, Ticket, User } from "lucide-react";
import { signUpAction, type AuthFormState } from "../auth/actions";

const initial: AuthFormState = { ok: false };

function SignUpForm() {
  const [state, formAction] = useFormState(signUpAction, initial);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  return (
    <>
      {state.error && (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-pink-dark/30 bg-pink-light/30 px-3.5 py-2 text-[13px] font-medium text-brown"
        >
          {state.error}
        </p>
      )}

      <form action={formAction} className="mt-5 space-y-3.5">
        <input type="hidden" name="next" value={next} />
        <Field
          name="name"
          label="Your Name"
          icon={<User className="h-4 w-4" />}
          placeholder="Your full name"
          autoComplete="name"
          error={state.fieldErrors?.name}
        />
        <Field
          name="email"
          type="email"
          label="Email Address"
          icon={<Mail className="h-4 w-4" />}
          placeholder="you@example.com"
          autoComplete="email"
          error={state.fieldErrors?.email}
        />
        <Field
          name="password"
          type="password"
          label="Choose a Password"
          icon={
            <Heart className="h-4 w-4" fill="currentColor" strokeWidth={0} />
          }
          placeholder="At least 8 characters"
          autoComplete="new-password"
          error={state.fieldErrors?.password}
        />
        <Field
          name="invitationCode"
          label="Invitation Code (optional)"
          icon={<Ticket className="h-4 w-4" />}
          placeholder="Have one? Enter it here"
          autoCapitalize="characters"
          error={state.fieldErrors?.invitationCode}
        />

        <SubmitButton />
      </form>
    </>
  );
}

export default function SignUpPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      {/* Soft brand wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(900px 600px at 12% -8%, rgba(187,221,211,0.32), transparent 60%), radial-gradient(800px 600px at 110% 10%, rgba(231,158,174,0.28), transparent 60%), radial-gradient(700px 500px at 50% 110%, rgba(231,158,174,0.18), transparent 60%)",
        }}
      />

      <div className="relative w-full max-w-md">
        <div
          className="relative overflow-hidden rounded-3xl bg-cream/95 p-7 shadow-card sm:p-8"
          style={{
            boxShadow:
              "0 30px 60px -28px rgba(90,49,20,0.35), 0 0 0 1px rgba(90,49,20,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
          }}
        >
          {/* gradient stripe */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-mint via-pink to-pink-dark" />

          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-dark">
              <Sparkles className="h-3 w-3" strokeWidth={2.6} />
              Join the Café
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-brown">
              Create your account 🐾
            </h1>
            <p className="mt-1.5 text-sm text-brown/70">
              Save your hearts, unlock coupons, build a bond with the cats.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="mt-5 h-72 animate-pulse rounded-2xl bg-white/40" />
            }
          >
            <SignUpForm />
          </Suspense>

          <p className="mt-4 text-center text-[12px] text-brown/55">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-semibold text-pink-dark hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brown px-5 py-3.5 text-sm font-semibold text-cream shadow-soft transition hover:bg-brown-400 hover:shadow-card disabled:cursor-wait disabled:opacity-75"
    >
      <Sparkles className="h-4 w-4 text-pink-light" strokeWidth={2.4} />
      {pending ? "Creating account…" : "Create my account"}
    </button>
  );
}

function Field({
  name,
  label,
  icon,
  type = "text",
  placeholder,
  autoComplete,
  autoCapitalize,
  error,
}: {
  name: string;
  label: string;
  icon: React.ReactNode;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  autoCapitalize?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brown/70">
        {label}
      </span>
      <div
        className={`flex items-center gap-2.5 rounded-2xl border bg-white/80 px-3.5 py-3 shadow-sm transition focus-within:bg-white focus-within:shadow-soft ${
          error
            ? "border-pink-dark/60 focus-within:border-pink-dark"
            : "border-brown/15 focus-within:border-brown/40"
        }`}
      >
        <span className="text-brown/50">{icon}</span>
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          className="w-full bg-transparent text-sm text-brown placeholder:text-brown/35 focus:outline-none"
        />
      </div>
      {error && (
        <span className="mt-1 block text-xs text-pink-dark">{error}</span>
      )}
    </label>
  );
}
