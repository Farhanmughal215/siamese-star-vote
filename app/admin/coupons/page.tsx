import { Check, Clock, Gift, Trash2 } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/ssr/server";
import { deleteCoupon, markCouponRedeemed } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = { status?: string; q?: string };

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createServiceRoleClient();
  const statusFilter = ["active", "redeemed", "expired"].includes(
    searchParams.status ?? "",
  )
    ? (searchParams.status as "active" | "redeemed" | "expired")
    : "active";
  const search = (searchParams.q ?? "").trim();

  let query = supabase
    .from("coupons_view")
    .select("*")
    .eq("status", statusFilter)
    .order("issued_at", { ascending: false })
    .limit(100);
  if (search.length > 0) {
    query = query.ilike("coupon_code", `%${search}%`);
  }

  const { data: coupons } = await query;

  return (
    <div>
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brown/55">
          Reward Coupons
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-brown">
          Coupons
        </h1>
        <p className="mt-1 text-sm text-brown/65">
          Search by code, filter by status, mark coupons as redeemed when
          customers present them.
        </p>
      </header>

      {/* Filter tabs + search */}
      <form
        method="GET"
        className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-brown/10 bg-white/60 p-2"
      >
        <div className="flex gap-1">
          <TabLink active={statusFilter === "active"} status="active">
            Active
          </TabLink>
          <TabLink active={statusFilter === "redeemed"} status="redeemed">
            Redeemed
          </TabLink>
          <TabLink active={statusFilter === "expired"} status="expired">
            Expired
          </TabLink>
        </div>
        <input
          name="q"
          defaultValue={search}
          placeholder="Search by code (e.g. MEOW-1234)"
          className="ml-auto w-full rounded-full border border-brown/15 bg-white px-3 py-1.5 text-sm text-brown placeholder:text-brown/35 focus:border-brown/40 focus:outline-none sm:w-64"
        />
        <input type="hidden" name="status" value={statusFilter} />
      </form>

      {/* Coupon list */}
      <div className="overflow-hidden rounded-2xl border border-brown/10 bg-white/80">
        {(coupons ?? []).length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-brown/55">
            No {statusFilter} coupons{search.length > 0 ? ` matching "${search}"` : ""}.
          </div>
        ) : (
          <ul className="divide-y divide-brown/8">
            {(coupons ?? []).map((c) => (
              <CouponRow
                key={c.id as string}
                coupon={c as CouponViewRow}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type CouponViewRow = {
  id: string;
  coupon_code: string;
  voter_name: string;
  voter_email: string;
  cat_name: string;
  reward_title: string;
  status: "active" | "redeemed" | "expired";
  issued_at: string;
  expires_at: string;
  redeemed_at: string | null;
};

function CouponRow({ coupon }: { coupon: CouponViewRow }) {
  const isActive = coupon.status === "active";
  const expiresAt = new Date(coupon.expires_at);
  const isExpired = expiresAt.getTime() < Date.now();

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink to-pink-dark text-cream shadow-soft">
        <Gift className="h-5 w-5" strokeWidth={2.2} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-[15px] font-bold tracking-[0.1em] text-brown">
            {coupon.coupon_code}
          </span>
          <StatusBadge status={coupon.status} expired={isExpired} />
        </div>
        <p className="mt-0.5 text-[13px] text-brown/75">
          <span className="font-semibold">{coupon.reward_title}</span>{" "}
          <span className="text-brown/45">·</span>{" "}
          From <span className="font-semibold text-pink-dark">{coupon.cat_name}</span>{" "}
          for{" "}
          <span className="font-semibold">{coupon.voter_name}</span>{" "}
          <span className="text-brown/45">({coupon.voter_email})</span>
        </p>
        <p className="mt-0.5 text-[11px] text-brown/55">
          Issued {formatDate(new Date(coupon.issued_at))} · Expires{" "}
          {formatDate(expiresAt)}
          {coupon.redeemed_at && (
            <>
              {" "}
              <span className="text-brown/45">·</span> Redeemed{" "}
              {formatDate(new Date(coupon.redeemed_at))}
            </>
          )}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
        {isActive && !isExpired && (
          <form
            action={async () => {
              "use server";
              await markCouponRedeemed(coupon.id);
            }}
          >
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brown px-4 py-2 text-xs font-semibold text-cream shadow-soft transition hover:bg-brown-400 hover:shadow-card sm:w-auto"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
              Mark Redeemed
            </button>
          </form>
        )}
        <form
          action={async () => {
            "use server";
            await deleteCoupon(coupon.id);
          }}
        >
          <button
            type="submit"
            title="Permanently delete this coupon"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-pink-dark/30 bg-pink-light/30 px-3 py-2 text-xs font-semibold text-pink-dark transition hover:bg-pink-light/50 sm:w-auto"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.4} />
            Delete
          </button>
        </form>
      </div>
    </li>
  );
}

function StatusBadge({
  status,
  expired,
}: {
  status: "active" | "redeemed" | "expired";
  expired: boolean;
}) {
  if (status === "redeemed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-mint-dark/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mint-dark">
        <Check className="h-3 w-3" strokeWidth={2.6} />
        Redeemed
      </span>
    );
  }
  if (status === "expired" || expired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brown/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brown/55">
        <Clock className="h-3 w-3" strokeWidth={2.6} />
        Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-pink-light/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-dark">
      <Gift className="h-3 w-3" strokeWidth={2.6} />
      Active
    </span>
  );
}

function TabLink({
  active,
  status,
  children,
}: {
  active: boolean;
  status: string;
  children: React.ReactNode;
}) {
  // Use a label+hidden-input pattern would force JS; simpler: use an
  // anchor. Keeps the page server-rendered and shareable.
  return (
    <a
      href={`?status=${status}`}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-brown text-cream shadow-soft"
          : "text-brown/65 hover:bg-white"
      }`}
    >
      {children}
    </a>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
