import { Plus, Trash2 } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/ssr/server";
import {
  addInvitationCode,
  deleteInvitationCode,
  toggleInvitationCode,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminCodesPage() {
  const supabase = createServiceRoleClient();
  const { data: codes } = await supabase
    .from("invitation_codes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brown/55">
          Entry Whitelist
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-brown">
          Invitation Codes
        </h1>
        <p className="mt-1 text-sm text-brown/65">
          Add new codes for campaigns, deactivate ones you don&apos;t want
          accepted anymore.
        </p>
      </header>

      {/* Add new code */}
      <form
        action={addInvitationCode}
        className="mb-5 flex flex-col gap-2 rounded-2xl border border-brown/10 bg-white/80 p-3 sm:flex-row sm:items-end"
      >
        <label className="block flex-1">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-brown/55">
            New Code
          </span>
          <input
            name="code"
            placeholder="e.g. SUMMER-2026"
            autoCapitalize="characters"
            required
            className="w-full rounded-full border border-brown/15 bg-white px-3 py-2 text-sm text-brown focus:border-brown/40 focus:outline-none"
          />
        </label>
        <label className="block flex-1">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-brown/55">
            Label (optional)
          </span>
          <input
            name="label"
            placeholder="What is this code for?"
            className="w-full rounded-full border border-brown/15 bg-white px-3 py-2 text-sm text-brown focus:border-brown/40 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-brown px-4 py-2 text-sm font-semibold text-cream shadow-soft transition hover:bg-brown-400"
        >
          <Plus className="h-4 w-4" strokeWidth={2.6} />
          Add Code
        </button>
      </form>

      {/* Codes list */}
      <div className="overflow-hidden rounded-2xl border border-brown/10 bg-white/80">
        {(codes ?? []).length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-brown/55">
            No codes yet — add one above.
          </p>
        ) : (
          <ul className="divide-y divide-brown/8">
            {(codes ?? []).map((code) => (
              <li
                key={code.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold tracking-[0.1em] text-brown">
                    {code.code}
                  </p>
                  {code.label && (
                    <p className="text-[12px] text-brown/65">{code.label}</p>
                  )}
                  <p className="text-[11px] text-brown/45">
                    Used <span className="font-semibold">{code.usage_count}</span>{" "}
                    {code.usage_count === 1 ? "time" : "times"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    code.is_active
                      ? "bg-mint-dark/15 text-mint-dark"
                      : "bg-brown/10 text-brown/55"
                  }`}
                >
                  {code.is_active ? "Active" : "Disabled"}
                </span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <form
                    action={async () => {
                      "use server";
                      await toggleInvitationCode(code.id, !code.is_active);
                    }}
                  >
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-brown/15 bg-white/60 px-3 py-1.5 text-xs font-semibold text-brown transition hover:bg-white sm:w-auto"
                    >
                      {code.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await deleteInvitationCode(code.id);
                    }}
                  >
                    <button
                      type="submit"
                      title="Permanently delete this invitation code"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-pink-dark/30 bg-pink-light/30 px-3 py-1.5 text-xs font-semibold text-pink-dark transition hover:bg-pink-light/50 sm:w-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2.4} />
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
