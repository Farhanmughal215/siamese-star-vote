import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  BookOpen,
  Cat,
  CalendarDays,
  Gift,
  LogOut,
  Settings,
  Ticket,
  Trophy,
  Users,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/ssr/server";
import { signOutAction } from "../auth/actions";

/**
 * Admin shell — wraps every page under /admin/*. Server-renders the
 * sidebar, gates access to admins only, and provides a sign-out form.
 *
 * Auth flow:
 *   - Not signed in → middleware already redirected to /signin
 *   - Signed in but is_admin=false → redirect to /profile with a soft note
 *   - Signed in + is_admin=true → render the page
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin?next=/admin");

  const { data: voter } = await supabase
    .from("voters")
    .select("name, email, is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!voter?.is_admin) {
    redirect("/profile");
  }

  return (
    <div className="relative min-h-screen bg-cream">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(900px 600px at 12% -8%, rgba(187,221,211,0.25), transparent 60%), radial-gradient(800px 600px at 110% 10%, rgba(231,158,174,0.2), transparent 60%)",
        }}
      />

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-brown/10 bg-cream/90 backdrop-blur lg:flex">
          <div className="border-b border-brown/10 px-5 py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brown/55">
              Siamese Cat Café
            </p>
            <h1 className="mt-1 font-display text-lg font-bold leading-tight text-brown">
              Admin Console
            </h1>
          </div>

          <nav className="flex-1 px-3 py-4">
            <NavItem href="/admin" icon={<BarChart3 className="h-4 w-4" />}>
              Overview
            </NavItem>
            <NavItem
              href="/admin/activity"
              icon={<Activity className="h-4 w-4" />}
            >
              Activity
            </NavItem>
            <NavItem
              href="/admin/coupons"
              icon={<Ticket className="h-4 w-4" />}
            >
              Coupons
            </NavItem>
            <NavItem href="/admin/cats" icon={<Cat className="h-4 w-4" />}>
              Cats
            </NavItem>
            <NavItem
              href="/admin/seasons"
              icon={<CalendarDays className="h-4 w-4" />}
            >
              Seasons
            </NavItem>
            <NavItem
              href="/admin/rewards"
              icon={<Gift className="h-4 w-4" />}
            >
              Wheel Rewards
            </NavItem>
            <NavItem
              href="/admin/voters"
              icon={<Users className="h-4 w-4" />}
            >
              Voters
            </NavItem>
            <NavItem
              href="/admin/codes"
              icon={<BookOpen className="h-4 w-4" />}
            >
              Invitation Codes
            </NavItem>
            <NavItem
              href="/admin/settings"
              icon={<Settings className="h-4 w-4" />}
            >
              Settings
            </NavItem>
          </nav>

          <div className="border-t border-brown/10 px-3 py-4">
            {/* Quick link to the public live results — open this in a
                second window/tab for the in-store projection. */}
            <Link
              href="/results"
              target="_blank"
              className="mb-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-pink to-pink-dark px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-cream shadow-soft transition hover:shadow-card"
            >
              <Trophy className="h-3.5 w-3.5" strokeWidth={2.6} />
              Open live results
            </Link>
            <div className="rounded-2xl bg-white/60 p-3 text-[12px]">
              <p className="font-semibold text-brown">
                {voter.name ?? "Admin"}
              </p>
              <p className="truncate text-brown/55">{voter.email}</p>
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-brown/15 bg-white/60 px-3 py-2 text-[11px] font-semibold text-brown/70 transition hover:bg-white"
              >
                Public site →
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-brown/15 bg-white/60 px-3 py-2 text-[11px] font-semibold text-brown/70 transition hover:border-pink-dark/40 hover:bg-white hover:text-brown"
                >
                  <LogOut className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Mobile top bar (hidden on lg+) */}
        <div className="lg:hidden">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-brown/10 bg-cream/90 px-4 py-3 backdrop-blur">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-brown/55">
                Siamese Cat Café
              </p>
              <h1 className="font-display text-base font-bold leading-tight text-brown">
                Admin
              </h1>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full border border-brown/15 bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-brown/70"
              >
                <LogOut className="h-3 w-3" strokeWidth={2.4} />
                Sign Out
              </button>
            </form>
          </header>
          <MobileNav />
        </div>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}

function NavItem({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold text-brown/65 transition hover:bg-pink-light/35 hover:text-brown"
    >
      <span className="text-pink-dark/80 transition group-hover:text-pink-dark">
        {icon}
      </span>
      <span>{children}</span>
    </Link>
  );
}

function MobileNav() {
  // Simple horizontal scroll bar for mobile nav.
  return (
    <nav className="sticky top-[57px] z-20 flex gap-1 overflow-x-auto border-b border-brown/10 bg-cream/85 px-3 py-2 backdrop-blur scrollbar-none">
      <MobileNavItem href="/admin">Overview</MobileNavItem>
      <MobileNavItem href="/admin/activity">Activity</MobileNavItem>
      <MobileNavItem href="/admin/coupons">Coupons</MobileNavItem>
      <MobileNavItem href="/admin/cats">Cats</MobileNavItem>
      <MobileNavItem href="/admin/seasons">Seasons</MobileNavItem>
      <MobileNavItem href="/admin/rewards">Rewards</MobileNavItem>
      <MobileNavItem href="/admin/voters">Voters</MobileNavItem>
      <MobileNavItem href="/admin/codes">Codes</MobileNavItem>
      <MobileNavItem href="/admin/settings">Settings</MobileNavItem>
    </nav>
  );
}

function MobileNavItem({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-brown/70"
    >
      {children}
    </Link>
  );
}
