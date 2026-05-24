import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  Heart,
  LogOut,
  Mail,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/ssr/server";
import { signOutAction } from "../auth/actions";

export default async function ProfilePage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin?next=/profile");

  // Pull the matching voter row + a few stats.
  const { data: voter } = await supabase
    .from("voters")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const [{ count: heartsCount }, { count: couponsCount }] = await Promise.all([
    supabase
      .from("hearts")
      .select("*", { count: "exact", head: true })
      .eq("voter_id", voter?.id ?? ""),
    supabase
      .from("coupons")
      .select("*", { count: "exact", head: true })
      .eq("voter_id", voter?.id ?? ""),
  ]);

  const displayName = voter?.name ?? user.email ?? "Friend";
  const memberSince = voter?.created_at
    ? new Date(voter.created_at).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <main className="relative min-h-screen px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(900px 600px at 12% -8%, rgba(187,221,211,0.28), transparent 60%), radial-gradient(800px 600px at 110% 10%, rgba(231,158,174,0.22), transparent 60%)",
        }}
      />
      <div className="mx-auto max-w-2xl">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brown/70 hover:text-brown"
          >
            ← Back to cats
          </Link>
        </div>

        <div
          className="relative overflow-hidden rounded-3xl bg-cream/95 p-7 shadow-card sm:p-9"
          style={{
            boxShadow:
              "0 30px 60px -28px rgba(90,49,20,0.35), 0 0 0 1px rgba(90,49,20,0.06)",
          }}
        >
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-mint via-pink to-pink-dark" />

          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink to-pink-dark text-cream shadow-card sm:h-20 sm:w-20">
              <span className="font-display text-2xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1 rounded-full bg-pink/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-pink-dark">
                <Sparkles className="h-3 w-3" strokeWidth={2.6} />
                Your Profile
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold leading-tight text-brown sm:text-3xl">
                {displayName}
              </h1>
              {voter?.is_admin && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brown px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream">
                  <Shield className="h-3 w-3" strokeWidth={2.6} />
                  Admin
                </span>
              )}
            </div>
          </div>

          {/* Info rows */}
          <div className="mt-6 space-y-2">
            <Row icon={<Mail className="h-4 w-4" />} label="Email">
              {user.email}
            </Row>
            <Row icon={<User className="h-4 w-4" />} label="Invitation Code">
              {voter?.invitation_code ?? "—"}
            </Row>
            {memberSince && (
              <Row icon={<Calendar className="h-4 w-4" />} label="Member since">
                {memberSince}
              </Row>
            )}
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Stat
              label="Hearts shared"
              value={String(heartsCount ?? 0)}
              icon={
                <Heart className="h-4 w-4" fill="currentColor" strokeWidth={0} />
              }
            />
            <Stat
              label="Coupons earned"
              value={String(couponsCount ?? 0)}
              icon={<Sparkles className="h-4 w-4" strokeWidth={2.4} />}
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brown px-5 py-3 text-sm font-semibold text-cream shadow-soft transition hover:bg-brown-400 sm:flex-1"
            >
              <BookOpen className="h-4 w-4" strokeWidth={2.4} />
              Vote for a cat
            </Link>
            {voter?.is_admin && (
              <Link
                href="/admin"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-brown/15 bg-white/80 px-5 py-3 text-sm font-semibold text-brown shadow-soft transition hover:bg-white sm:flex-1"
              >
                <Shield className="h-4 w-4" strokeWidth={2.4} />
                Admin Dashboard
              </Link>
            )}
            <form action={signOutAction} className="sm:flex-1">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-brown/15 bg-white/60 px-5 py-3 text-sm font-semibold text-brown/70 transition hover:border-pink-dark/40 hover:bg-white hover:text-brown"
              >
                <LogOut className="h-4 w-4" strokeWidth={2.4} />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/60 px-3.5 py-2.5">
      <div className="flex items-center gap-2 text-brown/65">
        <span className="text-pink-dark">{icon}</span>
        <span className="text-[12px] font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <span className="font-display text-[13px] font-bold text-brown">
        {children}
      </span>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-brown/10 bg-gradient-to-br from-pink-light/40 via-cream to-mint-light/30 px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-1.5 text-pink-dark">
        <span aria-hidden="true">{icon}</span>
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-brown/55">
          {label}
        </span>
      </div>
      <span className="font-display text-2xl font-bold text-brown">
        {value}
      </span>
    </div>
  );
}
