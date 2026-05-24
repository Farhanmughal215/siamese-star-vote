import { createServiceRoleClient } from "@/lib/supabase/ssr/server";
import { updateSetting } from "../actions";

export const dynamic = "force-dynamic";

const KNOWN_SETTINGS = [
  {
    key: "heart_cooldown_hours",
    label: "Heart cooldown (hours)",
    help: "How long until a voter can heart the same cat again. Default: 5",
  },
  {
    key: "coupon_expiry_days",
    label: "Coupon expiry (days)",
    help: "How many days after issuing a coupon stays valid. Default: 7",
  },
  {
    key: "wheel_win_rate",
    label: "Wheel win rate (%)",
    help: "Probability the Paw Fortune wheel lands on a winning section. Default: 20",
  },
];

export default async function AdminSettingsPage() {
  const supabase = createServiceRoleClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("*");

  const byKey = new Map(
    (settings ?? []).map((s) => [s.setting_key, s.setting_value]),
  );

  return (
    <div>
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brown/55">
          Runtime Configuration
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-brown">
          Settings
        </h1>
        <p className="mt-1 text-sm text-brown/65">
          Edit values live — no redeploy needed.
        </p>
      </header>

      <div className="space-y-4">
        {KNOWN_SETTINGS.map((s) => (
          <SettingRow
            key={s.key}
            settingKey={s.key}
            label={s.label}
            help={s.help}
            value={byKey.get(s.key) ?? ""}
          />
        ))}
      </div>

      <p className="mt-6 text-[11px] italic text-brown/45">
        Note: the frontend reads these from the database via the
        <code className="mx-1 rounded bg-brown/8 px-1">app_settings</code>
        table. Some settings (cooldown, expiry) are also baked as defaults
        in the client code — updating them here takes effect on next page
        load.
      </p>
    </div>
  );
}

function SettingRow({
  settingKey,
  label,
  help,
  value,
}: {
  settingKey: string;
  label: string;
  help: string;
  value: string;
}) {
  return (
    <form
      action={async (formData: FormData) => {
        "use server";
        const newValue = String(formData.get("value") ?? "").trim();
        if (newValue.length > 0) {
          await updateSetting(settingKey, newValue);
        }
      }}
      className="rounded-2xl border border-brown/10 bg-white/80 p-4 shadow-sm"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-brown">
            {label}
          </h2>
          <p className="mt-0.5 text-[11px] text-brown/55">{help}</p>
          <p className="mt-0.5 text-[10px] font-mono uppercase tracking-wider text-brown/45">
            key: {settingKey}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <input
          name="value"
          defaultValue={value}
          className="flex-1 rounded-full border border-brown/15 bg-white px-3 py-2 text-sm font-display font-bold text-brown focus:border-brown/40 focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brown px-4 py-2 text-xs font-semibold text-cream shadow-soft transition hover:bg-brown-400"
        >
          Save
        </button>
      </div>
    </form>
  );
}
