import {
  Shield,
  Trash2,
  UserCog,
  Mail,
  Crown,
  User,
  KeyRound,
} from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/ssr/server";
import {
  deleteVoter,
  resetVoterPassword,
  setVoterAdmin,
  updateVoter,
} from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string };

export default async function AdminVotersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createServiceRoleClient();
  const search = (searchParams.q ?? "").trim();

  let query = supabase
    .from("voters")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (search.length > 0) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  const { data: voters } = await query;

  const ids = (voters ?? []).map((v) => v.id);
  const [heartsAgg, couponsAgg, spinsAgg] = await Promise.all([
    ids.length > 0
      ? supabase.from("hearts").select("voter_id").in("voter_id", ids)
      : Promise.resolve({ data: [] as { voter_id: string }[] }),
    ids.length > 0
      ? supabase.from("coupons").select("voter_id").in("voter_id", ids)
      : Promise.resolve({ data: [] as { voter_id: string }[] }),
    ids.length > 0
      ? supabase.from("wheel_spins").select("voter_id").in("voter_id", ids)
      : Promise.resolve({ data: [] as { voter_id: string }[] }),
  ]);

  const heartsByVoter = new Map<string, number>();
  for (const h of heartsAgg.data ?? []) {
    heartsByVoter.set(h.voter_id, (heartsByVoter.get(h.voter_id) ?? 0) + 1);
  }
  const couponsByVoter = new Map<string, number>();
  for (const c of couponsAgg.data ?? []) {
    couponsByVoter.set(c.voter_id, (couponsByVoter.get(c.voter_id) ?? 0) + 1);
  }
  const spinsByVoter = new Map<string, number>();
  for (const s of spinsAgg.data ?? []) {
    spinsByVoter.set(s.voter_id, (spinsByVoter.get(s.voter_id) ?? 0) + 1);
  }

  return (
    <div>
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brown/55">
          Registered Visitors
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-brown">
          Voters
        </h1>
        <p className="mt-1 text-sm text-brown/65">
          Search, edit profile, promote to admin, or remove an account
          entirely (cascades hearts, spins and coupons).
        </p>
      </header>

      <form
        method="GET"
        className="mb-5 flex items-center gap-2 rounded-2xl border border-brown/10 bg-white/60 p-2"
      >
        <input
          name="q"
          defaultValue={search}
          placeholder="Search by name or email"
          className="w-full rounded-full border border-brown/15 bg-white px-3 py-1.5 text-sm text-brown placeholder:text-brown/35 focus:border-brown/40 focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-full bg-brown px-4 py-1.5 text-xs font-semibold text-cream"
        >
          Search
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-brown/10 bg-white/80">
        {(voters ?? []).length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-brown/55">
            No voters{search.length > 0 ? ` match "${search}"` : ""}.
          </p>
        ) : (
          <ul className="divide-y divide-brown/8">
            {(voters ?? []).map((v) => (
              <li key={v.id}>
                <details className="group">
                  <summary className="grid cursor-pointer list-none grid-cols-1 gap-2 px-4 py-3 transition hover:bg-pink-light/15 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-display text-[15px] font-bold text-brown">
                          {v.name}
                        </p>
                        {v.is_admin && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brown px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cream">
                            <Shield className="h-2.5 w-2.5" strokeWidth={2.6} />
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[12px] text-brown/65">
                        {v.email}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-brown/45">
                        {v.invitation_code} ·{" "}
                        {new Date(v.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span className="rounded-full bg-pink-light/40 px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-pink-dark">
                      {heartsByVoter.get(v.id) ?? 0}{" "}
                      {(heartsByVoter.get(v.id) ?? 0) === 1
                        ? "heart"
                        : "hearts"}
                    </span>
                    <span className="rounded-full bg-mint-light/40 px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-mint-dark">
                      {spinsByVoter.get(v.id) ?? 0}{" "}
                      {(spinsByVoter.get(v.id) ?? 0) === 1 ? "spin" : "spins"}
                    </span>
                    <span className="rounded-full bg-pink/20 px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-pink-dark">
                      {couponsByVoter.get(v.id) ?? 0}{" "}
                      {(couponsByVoter.get(v.id) ?? 0) === 1
                        ? "coupon"
                        : "coupons"}
                    </span>
                    <span className="hidden text-[10px] font-bold uppercase tracking-wider text-brown/55 group-open:text-pink-dark sm:inline">
                      <UserCog className="inline h-3.5 w-3.5" />
                      <span className="ml-1">Manage</span>
                    </span>
                  </summary>

                  {/* Manage panel */}
                  <div className="border-t border-brown/8 bg-cream/40 px-4 py-4">
                    {/* Edit profile */}
                    <form action={updateVoter} className="space-y-2.5">
                      <input type="hidden" name="id" value={v.id} />
                      <p className="text-[11px] font-bold uppercase tracking-wider text-brown/55">
                        Edit Profile
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <LabeledInput
                          name="name"
                          label="Name"
                          icon={<User className="h-3.5 w-3.5" />}
                          defaultValue={v.name}
                        />
                        <LabeledInput
                          name="email"
                          label="Email"
                          type="email"
                          icon={<Mail className="h-3.5 w-3.5" />}
                          defaultValue={v.email}
                        />
                        <LabeledInput
                          name="invitation_code"
                          label="Invitation code"
                          defaultValue={v.invitation_code}
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-full bg-brown px-4 py-1.5 text-xs font-semibold text-cream shadow-soft transition hover:bg-brown-400"
                        >
                          Save changes
                        </button>
                      </div>
                    </form>

                    {/* Reset password */}
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const newPassword = String(
                          formData.get("new_password") ?? "",
                        );
                        await resetVoterPassword(v.id, newPassword);
                      }}
                      className="mt-4 flex flex-col gap-2 border-t border-brown/8 pt-3 sm:flex-row sm:items-end"
                    >
                      <label className="block flex-1">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-brown/55">
                          Reset Password
                        </span>
                        <div className="flex items-center gap-1.5 rounded-xl border border-brown/15 bg-white px-2.5 py-1.5 focus-within:border-brown/40">
                          <KeyRound className="h-3.5 w-3.5 text-brown/45" />
                          <input
                            name="new_password"
                            type="text"
                            placeholder="New password (min 8 chars)"
                            minLength={8}
                            required
                            className="w-full bg-transparent text-[13px] text-brown focus:outline-none"
                          />
                        </div>
                      </label>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brown px-4 py-1.5 text-xs font-semibold text-cream shadow-soft transition hover:bg-brown-400 sm:shrink-0"
                      >
                        <KeyRound className="h-3.5 w-3.5" strokeWidth={2.4} />
                        Set new password
                      </button>
                    </form>

                    {/* Admin role + danger zone */}
                    <div className="mt-4 flex flex-col gap-2 border-t border-brown/8 pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <form
                        action={async () => {
                          "use server";
                          await setVoterAdmin(v.id, !v.is_admin);
                        }}
                      >
                        <button
                          type="submit"
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            v.is_admin
                              ? "border-brown/15 bg-white/70 text-brown/70 hover:bg-white"
                              : "border-brown/15 bg-brown text-cream shadow-soft hover:bg-brown-400"
                          }`}
                        >
                          <Crown className="h-3.5 w-3.5" strokeWidth={2.4} />
                          {v.is_admin
                            ? "Demote to regular user"
                            : "Promote to admin"}
                        </button>
                      </form>

                      <form
                        action={async () => {
                          "use server";
                          await deleteVoter(v.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-full border border-pink-dark/30 bg-pink-light/30 px-3 py-1.5 text-xs font-semibold text-pink-dark transition hover:bg-pink-light/50"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.4} />
                          Delete voter (cascades all activity)
                        </button>
                      </form>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LabeledInput({
  name,
  label,
  defaultValue,
  type = "text",
  icon,
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-brown/55">
        {label}
      </span>
      <div className="flex items-center gap-1.5 rounded-xl border border-brown/15 bg-white px-2.5 py-1.5 focus-within:border-brown/40">
        {icon && <span className="text-brown/45">{icon}</span>}
        <input
          name={name}
          type={type}
          defaultValue={defaultValue}
          className="w-full bg-transparent text-[13px] text-brown focus:outline-none"
        />
      </div>
    </label>
  );
}
