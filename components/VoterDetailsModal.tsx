"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Crown,
  Heart,
  Mail,
  Phone,
  Sparkles,
  Ticket,
  User,
  X,
} from "lucide-react";
import { forwardRef, useEffect, useRef, useState } from "react";
import type { VoterProfile } from "@/lib/voterStorage";

type VoterDetailsModalProps = {
  open: boolean;
  /** Cat the user is about to vote for, when entering via the vote flow. */
  pendingCatName?: string | null;
  /** Pre-fill the form (e.g. when the user re-opens via header to edit). */
  initialProfile?: VoterProfile | null;
  onClose: () => void;
  /** Called after frontend validation passes. Parent decides what comes next. */
  onSubmit: (profile: VoterProfile) => void;
  /**
   * Optional async invitation-code check. Returns true when the code is
   * accepted, false to reject with an inline error. When not provided,
   * the modal falls back to its local "looks too short" heuristic.
   *
   * Implementations should fail-open on network errors so the user isn't
   * locked out when the backend is down.
   */
  validateInvitationCode?: (code: string) => Promise<boolean>;
};

type FormState = {
  invitationCode: string;
  name: string;
  email: string;
  phone: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

const emptyForm: FormState = {
  invitationCode: "",
  name: "",
  email: "",
  phone: "",
};

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.invitationCode.trim()) {
    errors.invitationCode = "Invitation code is required";
  } else if (form.invitationCode.trim().length < 4) {
    errors.invitationCode = "Code looks too short";
  }
  if (!form.name.trim()) {
    errors.name = "Please tell us your name";
  } else if (form.name.trim().length < 2) {
    errors.name = "Name is too short";
  }
  if (!form.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email";
  }
  if (!form.phone.trim()) {
    errors.phone = "Phone number is required";
  } else if (form.phone.replace(/\D/g, "").length < 7) {
    errors.phone = "Phone number looks too short";
  }
  return errors;
}

export default function VoterDetailsModal({
  open,
  pendingCatName,
  initialProfile,
  onClose,
  onSubmit,
  validateInvitationCode,
}: VoterDetailsModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // When the modal opens, focus the first field and seed form values from any
  // existing profile (used when the user re-opens to edit details).
  useEffect(() => {
    if (open) {
      setForm(
        initialProfile
          ? {
              invitationCode: initialProfile.invitationCode,
              name: initialProfile.name,
              email: initialProfile.email,
              phone: initialProfile.phone,
            }
          : emptyForm,
      );
      setErrors({});
      const t = window.setTimeout(() => firstFieldRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
  }, [open, initialProfile]);

  // Body scroll lock + Escape to close.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const update =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      if (errors[key]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    const profile: VoterProfile = {
      invitationCode: form.invitationCode.trim(),
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      createdAt: initialProfile?.createdAt ?? Date.now(),
    };

    // Async invitation validation against Supabase (when wired). Fails open
    // on network errors per the contract in validateInvitationCode.
    if (validateInvitationCode) {
      setSubmitting(true);
      try {
        const ok = await validateInvitationCode(profile.invitationCode);
        if (!ok) {
          setErrors({
            invitationCode:
              "We couldn't recognize this invitation code. Please check and try again.",
          });
          setSubmitting(false);
          return;
        }
      } catch {
        // Defensive: even if the validator throws, don't block the user —
        // the parent will retry the Supabase call and surface its own toast.
      } finally {
        setSubmitting(false);
      }
    }

    onSubmit(profile);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="voter-details-root"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="voter-details-title"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-brown/45 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="relative z-10 w-full rounded-t-[28px] sm:max-w-[480px] sm:rounded-[28px]"
          >
            <div className="relative max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-t-[28px] bg-cream shadow-glass-inset scrollbar-none sm:rounded-[28px]">
              {/* Gradient accent */}
              <div className="h-1.5 w-full bg-gradient-to-r from-mint via-pink to-pink-dark" />

              {/* Mobile grab handle */}
              <div
                aria-hidden="true"
                className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-brown/15 sm:hidden"
              />

              {/* Close X */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-brown shadow-soft transition hover:bg-white"
              >
                <X className="h-4 w-4" strokeWidth={2.4} />
              </button>

              {/* Decorative paw watermark */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-6 -top-6 text-pink/22"
              >
                <svg viewBox="0 0 64 64" className="h-28 w-28" fill="currentColor">
                  <ellipse cx="32" cy="42" rx="14" ry="11" />
                  <ellipse cx="14" cy="26" rx="6" ry="8" />
                  <ellipse cx="50" cy="26" rx="6" ry="8" />
                  <ellipse cx="22" cy="12" rx="5" ry="7" />
                  <ellipse cx="42" cy="12" rx="5" ry="7" />
                </svg>
              </div>

              <div className="relative px-6 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-8">
                {/* Header */}
                <div className="mb-5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-pink/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-pink-dark">
                    <Crown className="h-3 w-3" strokeWidth={2.6} />
                    Voter Details
                  </span>
                  <h2
                    id="voter-details-title"
                    className="mt-2 font-display text-2xl font-bold leading-tight text-brown sm:text-[26px]"
                  >
                    Almost there! Save your daily heart 🐾
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-brown/70">
                    Enter your café invitation details so we can count your
                    vote and prepare any rewards you unlock.
                  </p>

                  {pendingCatName && (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-mint/40 px-3 py-1 text-[11px] font-semibold text-brown-400">
                      <Heart
                        className="h-3 w-3 text-pink-dark"
                        fill="currentColor"
                        strokeWidth={0}
                      />
                      Voting for{" "}
                      <span className="font-display font-bold text-brown">
                        {pendingCatName}
                      </span>
                    </p>
                  )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
                  <Field
                    ref={firstFieldRef}
                    icon={<Ticket className="h-4 w-4" />}
                    label="Invitation Code"
                    placeholder="e.g. SIAMESE-2026"
                    value={form.invitationCode}
                    onChange={update("invitationCode")}
                    error={errors.invitationCode}
                    autoCapitalize="characters"
                  />
                  <Field
                    icon={<User className="h-4 w-4" />}
                    label="Your Name"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={update("name")}
                    error={errors.name}
                    autoComplete="name"
                  />
                  <Field
                    icon={<Mail className="h-4 w-4" />}
                    label="Email Address"
                    placeholder="you@example.com"
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    error={errors.email}
                    autoComplete="email"
                  />
                  <Field
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone Number"
                    placeholder="+1 555 000 0000"
                    type="tel"
                    value={form.phone}
                    onChange={update("phone")}
                    error={errors.phone}
                    autoComplete="tel"
                  />

                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileTap={submitting ? undefined : { scale: 0.97 }}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brown px-5 py-3.5 text-sm font-semibold text-cream shadow-soft transition hover:bg-brown-400 hover:shadow-card disabled:cursor-wait disabled:opacity-80"
                  >
                    <Sparkles className="h-4 w-4 text-pink-light" strokeWidth={2.4} />
                    {submitting ? "Checking…" : "Continue & Cast My Heart"}
                  </motion.button>

                  <p className="text-center text-[11px] text-brown/50">
                    Your details stay in your browser for now. We&apos;ll wire
                    secure storage later.
                  </p>
                </form>
              </div>

              <div className="h-2 sm:hidden" aria-hidden="true" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- Reusable form field ----------

type FieldProps = {
  icon: React.ReactNode;
  label: string;
  placeholder?: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  autoComplete?: string;
  autoCapitalize?: string;
};

const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  {
    icon,
    label,
    placeholder,
    type = "text",
    value,
    onChange,
    error,
    autoComplete,
    autoCapitalize,
  },
  ref,
) {
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
          ref={ref}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          className="w-full bg-transparent text-sm text-brown placeholder:text-brown/35 focus:outline-none"
        />
      </div>
      {error && <span className="mt-1 block text-xs text-pink-dark">{error}</span>}
    </label>
  );
});
