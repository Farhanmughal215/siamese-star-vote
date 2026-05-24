import { Gift, Heart, Sparkles, UserPlus } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/ssr/server";

export const dynamic = "force-dynamic";

type SearchParams = { kind?: string; limit?: string };

type FeedItem =
  | {
      kind: "heart";
      at: string;
      voter: string;
      cat: string;
      detail?: string;
    }
  | {
      kind: "spin";
      at: string;
      voter: string;
      cat: string;
      detail: string;
      win: boolean;
    }
  | {
      kind: "coupon";
      at: string;
      voter: string;
      cat: string;
      detail: string;
      status: "active" | "redeemed" | "expired";
    }
  | {
      kind: "signup";
      at: string;
      voter: string;
      detail: string;
    };

const KIND_LABEL: Record<FeedItem["kind"], string> = {
  heart: "Hearts",
  spin: "Wheel spins",
  coupon: "Coupons",
  signup: "Sign-ups",
};

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createServiceRoleClient();
  const kindFilter = ["heart", "spin", "coupon", "signup", "all"].includes(
    searchParams.kind ?? "",
  )
    ? (searchParams.kind as FeedItem["kind"] | "all")
    : "all";
  const limit = Math.max(20, Math.min(500, Number(searchParams.limit) || 100));

  // Pull more rows than `limit` from each source so we can merge & slice.
  const perSource = Math.max(50, Math.floor(limit * 1.5));

  const [heartsRes, spinsRes, couponsRes, votersRes] = await Promise.all([
    supabase
      .from("hearts_view")
      .select("voter_name, cat_name, hearted_at")
      .order("hearted_at", { ascending: false })
      .limit(perSource),
    supabase
      .from("wheel_spins_view")
      .select("voter_name, cat_name, result_type, reward_title, spun_at")
      .order("spun_at", { ascending: false })
      .limit(perSource),
    supabase
      .from("coupons_view")
      .select(
        "voter_name, cat_name, coupon_code, reward_title, status, issued_at",
      )
      .order("issued_at", { ascending: false })
      .limit(perSource),
    supabase
      .from("voters")
      .select("name, email, invitation_code, created_at")
      .order("created_at", { ascending: false })
      .limit(perSource),
  ]);

  const items: FeedItem[] = [];

  for (const h of heartsRes.data ?? []) {
    items.push({
      kind: "heart",
      at: h.hearted_at as string,
      voter: h.voter_name as string,
      cat: h.cat_name as string,
    });
  }
  for (const s of spinsRes.data ?? []) {
    const win = s.result_type === "win";
    items.push({
      kind: "spin",
      at: s.spun_at as string,
      voter: s.voter_name as string,
      cat: s.cat_name as string,
      detail: win
        ? `won ${s.reward_title}`
        : `spun the wheel · ${s.reward_title}`,
      win,
    });
  }
  for (const c of couponsRes.data ?? []) {
    items.push({
      kind: "coupon",
      at: c.issued_at as string,
      voter: c.voter_name as string,
      cat: c.cat_name as string,
      detail: `coupon ${c.coupon_code} · ${c.reward_title}`,
      status: c.status as "active" | "redeemed" | "expired",
    });
  }
  for (const v of votersRes.data ?? []) {
    items.push({
      kind: "signup",
      at: v.created_at as string,
      voter: v.name,
      detail: `joined with code ${v.invitation_code} (${v.email})`,
    });
  }

  const filtered =
    kindFilter === "all" ? items : items.filter((i) => i.kind === kindFilter);

  filtered.sort((a, b) => (a.at < b.at ? 1 : -1));
  const sliced = filtered.slice(0, limit);

  // Totals for the chip strip.
  const totals = {
    all: items.length,
    heart: items.filter((i) => i.kind === "heart").length,
    spin: items.filter((i) => i.kind === "spin").length,
    coupon: items.filter((i) => i.kind === "coupon").length,
    signup: items.filter((i) => i.kind === "signup").length,
  };

  return (
    <div>
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brown/55">
          Live Audit Log
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-brown">
          Activity
        </h1>
        <p className="mt-1 text-sm text-brown/65">
          Every heart, spin, coupon and sign-up across the café — most recent
          first. Filter by event type below.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-brown/10 bg-white/60 p-2">
        <FilterChip
          active={kindFilter === "all"}
          kind="all"
          label="Everything"
          count={totals.all}
        />
        <FilterChip
          active={kindFilter === "heart"}
          kind="heart"
          label="Hearts"
          count={totals.heart}
        />
        <FilterChip
          active={kindFilter === "spin"}
          kind="spin"
          label="Wheel spins"
          count={totals.spin}
        />
        <FilterChip
          active={kindFilter === "coupon"}
          kind="coupon"
          label="Coupons"
          count={totals.coupon}
        />
        <FilterChip
          active={kindFilter === "signup"}
          kind="signup"
          label="Sign-ups"
          count={totals.signup}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-brown/10 bg-white/80">
        {sliced.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-brown/55">
            No {kindFilter === "all" ? "activity" : KIND_LABEL[kindFilter]} yet.
          </p>
        ) : (
          <ul className="divide-y divide-brown/8">
            {sliced.map((item, i) => (
              <li
                key={`${item.kind}-${item.at}-${i}`}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <KindIcon kind={item.kind} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-brown">
                    <span className="font-semibold text-pink-dark">
                      {item.voter}
                    </span>{" "}
                    {renderAction(item)}
                  </p>
                  <p className="text-[11px] text-brown/55">
                    {new Date(item.at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {timeAgo(new Date(item.at))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {sliced.length === limit && (
        <p className="mt-3 text-center text-[11px] italic text-brown/55">
          Showing the most recent {limit} events. Apply a filter to focus, or
          increase the row cap via <code>?limit=200</code> in the URL.
        </p>
      )}
    </div>
  );
}

function renderAction(item: FeedItem) {
  switch (item.kind) {
    case "heart":
      return (
        <>
          hearted <span className="font-semibold text-brown">{item.cat}</span>
        </>
      );
    case "spin":
      return (
        <>
          {item.win ? (
            <span className="font-semibold text-mint-dark">{item.detail}</span>
          ) : (
            <span className="text-brown/75">{item.detail}</span>
          )}{" "}
          <span className="text-brown/45">·</span>{" "}
          <span className="font-semibold text-brown">{item.cat}</span>
        </>
      );
    case "coupon":
      return (
        <>
          received{" "}
          <span className="font-semibold text-brown">{item.detail}</span>{" "}
          <span className="text-brown/45">·</span>{" "}
          <span className="font-semibold text-pink-dark">{item.cat}</span>{" "}
          <span
            className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
              item.status === "redeemed"
                ? "bg-mint-dark/15 text-mint-dark"
                : item.status === "expired"
                  ? "bg-brown/10 text-brown/55"
                  : "bg-pink/15 text-pink-dark"
            }`}
          >
            {item.status}
          </span>
        </>
      );
    case "signup":
      return (
        <>
          <span className="text-brown/75">{item.detail}</span>
        </>
      );
  }
}

function FilterChip({
  active,
  kind,
  label,
  count,
}: {
  active: boolean;
  kind: "all" | FeedItem["kind"];
  label: string;
  count: number;
}) {
  const href = kind === "all" ? "?" : `?kind=${kind}`;
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-brown text-cream shadow-soft"
          : "bg-white/70 text-brown/65 hover:bg-white"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
          active ? "bg-cream/20" : "bg-brown/8"
        }`}
      >
        {count}
      </span>
    </a>
  );
}

function KindIcon({ kind }: { kind: FeedItem["kind"] }) {
  const map: Record<FeedItem["kind"], React.ReactNode> = {
    heart: (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-light/40 text-pink-dark">
        <Heart className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
      </div>
    ),
    spin: (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mint-light/50 text-mint-dark">
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
      </div>
    ),
    coupon: (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink/20 text-pink-dark">
        <Gift className="h-3.5 w-3.5" strokeWidth={2.4} />
      </div>
    ),
    signup: (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brown/12 text-brown">
        <UserPlus className="h-3.5 w-3.5" strokeWidth={2.4} />
      </div>
    ),
  };
  return <>{map[kind]}</>;
}

function timeAgo(date: Date): string {
  const diff = Math.max(0, Date.now() - date.getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
