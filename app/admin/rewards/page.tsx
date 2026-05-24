import { Gift, Percent, Plus, Sparkles, Trash2 } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/ssr/server";
import {
  createWheelReward,
  deleteWheelReward,
  toggleWheelReward,
  updateSetting,
  updateWheelReward,
} from "../actions";

export const dynamic = "force-dynamic";

type Reward = {
  id: string;
  label: string;
  wheel_label: string;
  emoji: string;
  type: "win" | "lose";
  coupon_title: string | null;
  sort_order: number;
  is_active: boolean;
};

export default async function AdminRewardsPage() {
  const supabase = createServiceRoleClient();
  const [{ data: rewards }, { data: settings }] = await Promise.all([
    supabase
      .from("wheel_rewards")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("app_settings")
      .select("setting_key, setting_value")
      .eq("setting_key", "wheel_win_rate"),
  ]);

  const list = (rewards ?? []) as Reward[];
  const activeWinCount = list.filter((r) => r.is_active && r.type === "win").length;
  const activeLoseCount = list.filter(
    (r) => r.is_active && r.type === "lose",
  ).length;
  const winRate = settings?.[0]?.setting_value ?? "20";

  return (
    <div>
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brown/55">
          Paw Fortune
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-brown">
          Wheel Rewards
        </h1>
        <p className="mt-1 text-sm text-brown/65">
          The sections drawn on the spinning wheel. Toggle visibility, edit
          coupon titles, reorder, or add new prizes.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full bg-mint-light/50 px-2.5 py-0.5 text-mint-dark">
            <Gift className="h-3 w-3" strokeWidth={2.6} />
            {activeWinCount} winning slices
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-pink-light/40 px-2.5 py-0.5 text-pink-dark">
            <Sparkles className="h-3 w-3" strokeWidth={2.6} />
            {activeLoseCount} better-luck slices
          </span>
        </div>
      </header>

      {/* Win-rate slider */}
      <form
        action={async (formData: FormData) => {
          "use server";
          const v = String(formData.get("wheel_win_rate") ?? "").trim();
          if (v.length > 0) await updateSetting("wheel_win_rate", v);
        }}
        className="mb-5 rounded-2xl border border-brown/10 bg-white/80 p-4 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-pink to-pink-dark text-cream shadow-card">
            <Percent className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <div>
            <h2 className="font-display text-base font-bold leading-tight text-brown">
              Wheel Win Probability
            </h2>
            <p className="text-[12px] text-brown/65">
              Percent of spins that land on a winning slice. Lower = rarer
              wins, higher = more coupons.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-brown/55">
              Win rate (%)
            </span>
            <input
              name="wheel_win_rate"
              type="number"
              min={0}
              max={100}
              step={1}
              defaultValue={winRate}
              className="w-full rounded-xl border border-brown/15 bg-white px-3 py-1.5 text-[13px] font-display font-bold text-brown focus:border-brown/40 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brown px-4 py-1.5 text-xs font-semibold text-cream shadow-soft transition hover:bg-brown-400"
          >
            Save win rate
          </button>
        </div>
      </form>

      {/* Add new reward */}
      <details className="group mb-5 rounded-2xl border border-brown/10 bg-white/80 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-brown">
            <Plus className="h-4 w-4 text-pink-dark" strokeWidth={2.6} />
            Add a new reward
          </span>
          <span className="text-[11px] text-brown/55 group-open:hidden">
            Click to expand
          </span>
        </summary>
        <form action={createWheelReward} className="border-t border-brown/8 p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <RField name="label" label="Full label *" required />
            <RField
              name="wheel_label"
              label="Short label (on wheel) *"
              required
            />
            <RField name="emoji" label="Emoji *" required placeholder="🎁" />
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-brown/55">
                Type *
              </span>
              <select
                name="type"
                defaultValue="win"
                className="w-full rounded-xl border border-brown/15 bg-white px-3 py-1.5 text-[13px] text-brown focus:border-brown/40 focus:outline-none"
              >
                <option value="win">Win (issues a coupon)</option>
                <option value="lose">Lose (better-luck slice)</option>
              </select>
            </label>
            <RField
              name="coupon_title"
              label="Coupon title (win only)"
              placeholder="e.g. Free Espresso"
              className="sm:col-span-2"
            />
            <RField
              name="sort_order"
              label="Sort order"
              type="number"
              defaultValue="0"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-brown px-4 py-1.5 text-xs font-semibold text-cream shadow-soft transition hover:bg-brown-400"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
              Add reward
            </button>
          </div>
        </form>
      </details>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brown/20 bg-white/40 px-4 py-10 text-center">
          <Gift className="mx-auto h-8 w-8 text-brown/35" strokeWidth={1.8} />
          <p className="mt-2 font-display text-base font-semibold text-brown/65">
            No rewards yet
          </p>
          <p className="text-[12px] text-brown/55">
            The wheel needs at least one win + one lose slice to spin cleanly.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <RewardRow key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function RewardRow({ r }: { r: Reward }) {
  return (
    <div
      className={`rounded-2xl border bg-white/80 p-4 shadow-sm ${
        r.is_active ? "border-brown/10" : "border-dashed border-brown/20 opacity-75"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-light/60 to-mint-light/40 text-2xl">
          {r.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold text-brown">
              {r.label}
            </h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                r.type === "win"
                  ? "bg-mint-dark/15 text-mint-dark"
                  : "bg-pink-light/60 text-pink-dark"
              }`}
            >
              {r.type === "win" ? (
                <>
                  <Gift className="h-3 w-3" strokeWidth={2.6} /> Win
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" strokeWidth={2.6} /> Lose
                </>
              )}
            </span>
            {!r.is_active && (
              <span className="rounded-full bg-brown/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brown/55">
                Hidden
              </span>
            )}
          </div>
          <p className="text-[12px] text-brown/65">
            Wheel label: <span className="font-semibold">{r.wheel_label}</span>{" "}
            · Order: <span className="font-semibold">{r.sort_order}</span>
            {r.coupon_title && (
              <>
                {" "}
                · Coupon:{" "}
                <span className="font-semibold text-pink-dark">
                  {r.coupon_title}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Edit form */}
      <form action={updateWheelReward} className="mt-3">
        <input type="hidden" name="id" value={r.id} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <RField name="label" label="Full label" defaultValue={r.label} />
          <RField
            name="wheel_label"
            label="Short label (on wheel)"
            defaultValue={r.wheel_label}
          />
          <RField name="emoji" label="Emoji" defaultValue={r.emoji} />
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-brown/55">
              Type
            </span>
            <select
              name="type"
              defaultValue={r.type}
              className="w-full rounded-xl border border-brown/15 bg-white px-3 py-1.5 text-[13px] text-brown focus:border-brown/40 focus:outline-none"
            >
              <option value="win">Win (issues a coupon)</option>
              <option value="lose">Lose (better-luck slice)</option>
            </select>
          </label>
          <RField
            name="coupon_title"
            label="Coupon title (win only)"
            defaultValue={r.coupon_title ?? ""}
            className="sm:col-span-2"
          />
          <RField
            name="sort_order"
            label="Sort order"
            type="number"
            defaultValue={String(r.sort_order)}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full bg-brown px-4 py-1.5 text-xs font-semibold text-cream shadow-soft transition hover:bg-brown-400"
          >
            Save changes
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-brown/8 pt-3">
        <form
          action={async () => {
            "use server";
            await toggleWheelReward(r.id, !r.is_active);
          }}
        >
          <button
            type="submit"
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              r.is_active
                ? "border-brown/15 bg-white/70 text-brown/70 hover:bg-white"
                : "border-mint-dark/30 bg-mint-light/40 text-mint-dark hover:bg-mint-light/60"
            }`}
          >
            {r.is_active ? "Hide from wheel" : "Show on wheel"}
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await deleteWheelReward(r.id);
          }}
          className="ml-auto"
        >
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full border border-pink-dark/30 bg-pink-light/30 px-3 py-1.5 text-xs font-semibold text-pink-dark transition hover:bg-pink-light/50"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.4} />
            Delete reward
          </button>
        </form>
      </div>
    </div>
  );
}

function RField({
  name,
  label,
  type = "text",
  defaultValue,
  placeholder,
  required = false,
  className = "",
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-brown/55">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-brown/15 bg-white px-3 py-1.5 text-[13px] text-brown focus:border-brown/40 focus:outline-none"
      />
    </label>
  );
}
