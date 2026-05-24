import Link from "next/link";
import {
  Activity as ActivityIcon,
  ArrowRight,
  Calendar,
  Check,
  Gift,
  Heart,
  Sparkles,
  Ticket,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/ssr/server";
import QuickRedeem from "./QuickRedeem";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const supabase = createServiceRoleClient();

  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const sevenDaysAgo = new Date(
    Date.now() - 6 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Run all stats queries in parallel.
  const [
    votersCountRes,
    newVotersTodayRes,
    heartsCountRes,
    todayHeartsRes,
    weekHeartsRes,
    activeCouponsRes,
    redeemedCouponsRes,
    catAffectionRes,
    recentHeartsRes,
    recentSignupsRes,
  ] = await Promise.all([
    supabase.from("voters").select("*", { count: "exact", head: true }),
    supabase
      .from("voters")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfToday),
    supabase.from("hearts").select("*", { count: "exact", head: true }),
    supabase
      .from("hearts")
      .select("*", { count: "exact", head: true })
      .gte("hearted_at", startOfToday),
    supabase
      .from("hearts")
      .select("*", { count: "exact", head: true })
      .gte("hearted_at", sevenDaysAgo),
    supabase
      .from("coupons")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("coupons")
      .select("*", { count: "exact", head: true })
      .eq("status", "redeemed"),
    supabase.from("cat_affection").select("cat_id, hearts_given"),
    supabase
      .from("hearts_view")
      .select("voter_name, cat_name, hearted_at")
      .order("hearted_at", { ascending: false })
      .limit(8),
    supabase
      .from("voters")
      .select("name, email, created_at, is_admin")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Today-only counters for the cafe-owner glance card.
  const [todayIssuedRes, todayRedeemedRes] = await Promise.all([
    supabase
      .from("coupons")
      .select("*", { count: "exact", head: true })
      .gte("issued_at", startOfToday),
    supabase
      .from("coupons")
      .select("*", { count: "exact", head: true })
      .eq("status", "redeemed")
      .gte("redeemed_at", startOfToday),
  ]);
  const todayIssued = todayIssuedRes.count ?? 0;
  const todayRedeemed = todayRedeemedRes.count ?? 0;

  const totalVoters = votersCountRes.count ?? 0;
  const newVotersToday = newVotersTodayRes.count ?? 0;
  const totalHearts = heartsCountRes.count ?? 0;
  const todayHearts = todayHeartsRes.count ?? 0;
  const weekHearts = weekHeartsRes.count ?? 0;
  const activeCoupons = activeCouponsRes.count ?? 0;
  const redeemedCoupons = redeemedCouponsRes.count ?? 0;

  // Compute the per-cat hearts breakdown from the affection rows.
  const heartsByCat = new Map<string, number>();
  for (const row of catAffectionRes.data ?? []) {
    heartsByCat.set(
      row.cat_id,
      (heartsByCat.get(row.cat_id) ?? 0) + row.hearts_given,
    );
  }
  // Resolve cat names for every cat that has affection rows so we can show a
  // proper leaderboard, not just the top one.
  const catIds = Array.from(heartsByCat.keys());
  const { data: catRows } = catIds.length
    ? await supabase
        .from("cats")
        .select("id, name, image_url")
        .in("id", catIds)
    : { data: [] as { id: string; name: string; image_url: string }[] };

  const catMeta = new Map(
    (catRows ?? []).map(
      (c) => [c.id, { name: c.name, image: c.image_url }] as const,
    ),
  );
  const leaderboard = Array.from(heartsByCat.entries())
    .map(([catId, hearts]) => ({
      catId,
      hearts,
      name: catMeta.get(catId)?.name ?? "(unknown cat)",
      image: catMeta.get(catId)?.image ?? null,
    }))
    .sort((a, b) => b.hearts - a.hearts);
  const topCatName = leaderboard[0]?.name ?? null;
  const topCatHearts = leaderboard[0]?.hearts ?? 0;

  return (
    <div>
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brown/55">
          Dashboard
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-brown">
          Overview
        </h1>
      </header>

      {/* Today at the Café + Quick Redeem — the cafe-owner / staff cockpit */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* Today at the Café */}
        <div className="rounded-3xl border border-brown/10 bg-gradient-to-br from-cream via-pink-light/15 to-mint-light/20 p-5 shadow-soft">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brown text-cream shadow-card">
              <Calendar className="h-4 w-4" strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brown/55">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <h2 className="font-display text-lg font-bold leading-tight text-brown">
                Today at the Café
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <TodayTile
              label="Hearts"
              value={todayHearts}
              icon={
                <Heart
                  className="h-4 w-4"
                  fill="currentColor"
                  strokeWidth={0}
                />
              }
            />
            <TodayTile
              label="Signups"
              value={newVotersToday}
              icon={<UserPlus className="h-4 w-4" strokeWidth={2.4} />}
            />
            <TodayTile
              label="Coupons issued"
              value={todayIssued}
              icon={<Gift className="h-4 w-4" strokeWidth={2.4} />}
            />
            <TodayTile
              label="Redeemed"
              value={todayRedeemed}
              icon={<Check className="h-4 w-4" strokeWidth={2.4} />}
              highlight={todayRedeemed > 0}
            />
          </div>
        </div>

        <QuickRedeem />
      </section>

      {/* Stat tiles */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="Voters"
          value={String(totalVoters)}
          sub={
            newVotersToday > 0
              ? `+${newVotersToday} today`
              : "no signups today"
          }
          icon={<Users className="h-4 w-4" />}
        />
        <StatTile
          label="Hearts (all time)"
          value={String(totalHearts)}
          sub={`${weekHearts} this week`}
          icon={<Heart className="h-4 w-4" fill="currentColor" strokeWidth={0} />}
        />
        <StatTile
          label="Hearts today"
          value={String(todayHearts)}
          icon={<Sparkles className="h-4 w-4" />}
          highlight
        />
        <StatTile
          label="Active coupons"
          value={String(activeCoupons)}
          icon={<Ticket className="h-4 w-4" />}
        />
        <StatTile
          label="Redeemed coupons"
          value={String(redeemedCoupons)}
          icon={<Gift className="h-4 w-4" />}
        />
        <StatTile
          label="Cats with hearts"
          value={String(heartsByCat.size)}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </section>

      {/* Top cat */}
      {topCatName && (
        <section className="mt-6 rounded-3xl border border-pink-dark/15 bg-gradient-to-br from-pink-light/35 via-cream to-mint-light/35 p-5 shadow-soft">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-dark">
            Most Loved
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-brown">
            {topCatName}
          </p>
          <p className="text-sm text-brown/65">
            {topCatHearts} {topCatHearts === 1 ? "heart" : "hearts"} earned
            from voters
          </p>
        </section>
      )}

      {/* Two-column dashboard: leaderboard + activity */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Cat leaderboard */}
        <div className="rounded-2xl border border-brown/10 bg-white/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-brown">
              Cat Leaderboard
            </h2>
            <Link
              href="/admin/cats"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-pink-dark hover:underline"
            >
              Manage cats <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {leaderboard.length === 0 ? (
            <p className="py-6 text-center text-sm text-brown/55">
              No hearts have been given yet.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {leaderboard.slice(0, 8).map((row, i) => {
                const max = leaderboard[0].hearts;
                const pct = max > 0 ? (row.hearts / max) * 100 : 0;
                return (
                  <li key={row.catId} className="group">
                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="w-5 shrink-0 text-right font-bold text-brown/45">
                        {i + 1}
                      </span>
                      {row.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.image}
                          alt={row.name}
                          className="h-7 w-7 shrink-0 rounded-lg object-cover ring-1 ring-brown/10"
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate font-semibold text-brown">
                        {row.name}
                      </span>
                      <span className="shrink-0 rounded-full bg-pink-light/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-dark">
                        {row.hearts} {row.hearts === 1 ? "heart" : "hearts"}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brown/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pink to-pink-dark transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Recent hearts */}
        <div className="rounded-2xl border border-brown/10 bg-white/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-brown">
              Recent Hearts
            </h2>
            <Link
              href="/admin/activity"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-pink-dark hover:underline"
            >
              <ActivityIcon className="h-3 w-3" />
              Full activity log <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {(recentHeartsRes.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-brown/55">
              No hearts yet. The café is quiet today 🐾
            </p>
          ) : (
            <ul className="divide-y divide-brown/8">
              {(recentHeartsRes.data ?? []).map((row, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-brown">
                      <span className="font-semibold text-pink-dark">
                        {row.voter_name}
                      </span>{" "}
                      hearted{" "}
                      <span className="font-semibold">{row.cat_name}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-brown/55">
                    {timeAgo(new Date(row.hearted_at as string))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Recent signups */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-brown">
            New Voters
          </h2>
          <Link
            href="/admin/voters"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-pink-dark hover:underline"
          >
            Manage voters <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-brown/10 bg-white/70">
          {(recentSignupsRes.data ?? []).length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-brown/55">
              No signups yet.
            </p>
          ) : (
            <ul className="divide-y divide-brown/8">
              {(recentSignupsRes.data ?? []).map((v, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-light/40 text-pink-dark">
                      <UserPlus className="h-3.5 w-3.5" strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brown">
                        {v.name}
                        {v.is_admin && (
                          <span className="ml-1.5 rounded-full bg-brown px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cream">
                            Admin
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[11px] text-brown/55">
                        {v.email}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-brown/55">
                    {timeAgo(new Date(v.created_at))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-2xl border px-3 py-3 shadow-sm backdrop-blur ${
        highlight
          ? "border-pink-dark/25 bg-gradient-to-br from-pink-light/50 via-cream to-pink-light/30"
          : "border-brown/10 bg-white/70"
      }`}
    >
      <div className="flex items-center gap-1.5 text-pink-dark">
        <span aria-hidden="true">{icon}</span>
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-brown/55">
          {label}
        </span>
      </div>
      <span className="font-display text-2xl font-bold text-brown">
        {value}
      </span>
      {sub && (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-brown/55">
          {sub}
        </span>
      )}
    </div>
  );
}

function TodayTile({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-0.5 rounded-2xl border px-3 py-2.5 ${
        highlight
          ? "border-mint-dark/30 bg-mint-light/40"
          : "border-brown/10 bg-white/70"
      }`}
    >
      <div
        className={`flex items-center gap-1.5 ${
          highlight ? "text-mint-dark" : "text-pink-dark"
        }`}
      >
        <span aria-hidden="true">{icon}</span>
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-brown/55">
          {label}
        </span>
      </div>
      <span className="font-display text-xl font-bold leading-none text-brown">
        {value}
      </span>
    </div>
  );
}

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
