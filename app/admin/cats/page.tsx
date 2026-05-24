import { Cat as CatIcon, Eye, EyeOff, Heart, Plus, Trash2 } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/ssr/server";
import {
  createCat,
  deleteCat,
  setCatActive,
  updateCat,
  type CatEdit,
} from "../actions";
import ImageUrlField from "./ImageUrlField";

export const dynamic = "force-dynamic";

type CatRow = {
  id: string;
  slug: string;
  name: string;
  title: string;
  personality: string;
  description: string;
  image_url: string;
  story_url: string | null;
  is_active: boolean;
};

export default async function AdminCatsPage() {
  const supabase = createServiceRoleClient();
  const [{ data: cats }, { data: affection }] = await Promise.all([
    supabase
      .from("cats")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase.from("cat_affection").select("cat_id, hearts_given"),
  ]);

  // Total hearts received per cat — shown as a popularity badge per row.
  const heartsByCat = new Map<string, number>();
  for (const row of affection ?? []) {
    heartsByCat.set(
      row.cat_id,
      (heartsByCat.get(row.cat_id) ?? 0) + row.hearts_given,
    );
  }

  const list = (cats ?? []) as CatRow[];
  const activeCount = list.filter((c) => c.is_active).length;
  const inactiveCount = list.length - activeCount;

  return (
    <div>
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brown/55">
          Candidate Roster
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-brown">
          Cats
        </h1>
        <p className="mt-1 text-sm text-brown/65">
          Add cats, edit profiles, toggle visibility on the public site, see
          who&apos;s most loved.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full bg-mint-light/50 px-2.5 py-0.5 text-mint-dark">
            <Eye className="h-3 w-3" strokeWidth={2.6} />
            {activeCount} live on site
          </span>
          {inactiveCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brown/10 px-2.5 py-0.5 text-brown/65">
              <EyeOff className="h-3 w-3" strokeWidth={2.6} />
              {inactiveCount} hidden
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-pink-light/40 px-2.5 py-0.5 text-pink-dark">
            <CatIcon className="h-3 w-3" strokeWidth={2.6} />
            {list.length} total
          </span>
        </div>
      </header>

      {/* Add new cat */}
      <details className="group mb-5 rounded-2xl border border-brown/10 bg-white/80 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-brown">
            <Plus className="h-4 w-4 text-pink-dark" strokeWidth={2.6} />
            Add a new cat
          </span>
          <span className="text-[11px] text-brown/55 group-open:hidden">
            Click to expand
          </span>
        </summary>
        <form action={createCat} className="border-t border-brown/8 p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <NewCatField name="name" label="Name *" required />
            <NewCatField
              name="slug"
              label="Slug (optional — auto-generated)"
              placeholder="e.g. mittens"
            />
            <NewCatField
              name="title"
              label="Title"
              placeholder="e.g. The Lap Mayor"
            />
            <NewCatField
              name="personality"
              label="Personality"
              placeholder="e.g. Cuddly · Watchful"
            />
            <NewCatField
              name="image_url"
              label="Image URL *"
              className="sm:col-span-2"
              required
              placeholder="https://…"
            />
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-brown/55">
                Description
              </span>
              <textarea
                name="description"
                rows={2}
                placeholder="A few warm sentences about this cat…"
                className="w-full rounded-xl border border-brown/15 bg-white px-3 py-2 text-[13px] text-brown focus:border-brown/40 focus:outline-none"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-brown px-4 py-1.5 text-xs font-semibold text-cream shadow-soft transition hover:bg-brown-400"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
              Create cat
            </button>
          </div>
        </form>
      </details>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brown/20 bg-white/40 px-4 py-10 text-center">
          <CatIcon
            className="mx-auto h-8 w-8 text-brown/35"
            strokeWidth={1.8}
          />
          <p className="mt-2 font-display text-base font-semibold text-brown/65">
            No cats yet
          </p>
          <p className="text-[12px] text-brown/55">
            Expand &ldquo;Add a new cat&rdquo; above to create your first.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((cat) => (
            <CatRow
              key={cat.id}
              cat={cat}
              heartsReceived={heartsByCat.get(cat.id) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CatRow({
  cat,
  heartsReceived,
}: {
  cat: CatRow;
  heartsReceived: number;
}) {
  const onSubmit = async (formData: FormData) => {
    "use server";
    const input: CatEdit = {
      id: cat.id,
      name: String(formData.get("name") ?? cat.name),
      title: String(formData.get("title") ?? cat.title),
      personality: String(formData.get("personality") ?? cat.personality),
      description: String(formData.get("description") ?? cat.description),
      image_url: String(formData.get("image_url") ?? cat.image_url),
      story_url: String(formData.get("story_url") ?? "") || null,
      // Active state is now controlled by the separate one-click toggle
      // below — preserve whatever the DB has so Save doesn't accidentally
      // re-hide a cat the admin just made visible.
      is_active: cat.is_active,
    };
    await updateCat(input);
  };

  return (
    <div
      className={`rounded-2xl border bg-white/80 p-4 shadow-sm transition ${
        cat.is_active
          ? "border-brown/10"
          : "border-dashed border-brown/20 opacity-75"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cat.image_url}
          alt={cat.name}
          className={`h-20 w-20 shrink-0 rounded-2xl object-cover ring-1 ring-brown/10 ${
            cat.is_active ? "" : "grayscale"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-display text-xl font-bold text-brown">
                  {cat.name}
                </h2>
                {!cat.is_active && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brown/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brown/55">
                    <EyeOff className="h-2.5 w-2.5" strokeWidth={2.6} />
                    Hidden
                  </span>
                )}
              </div>
              <p className="text-[12px] font-semibold text-brown/45">
                slug: <span className="text-brown/65">{cat.slug}</span>
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-pink-light/40 px-2.5 py-0.5 text-[11px] font-bold text-pink-dark">
              <Heart
                className="h-3 w-3"
                fill="currentColor"
                strokeWidth={0}
              />
              {heartsReceived} {heartsReceived === 1 ? "heart" : "hearts"}
            </span>
          </div>
        </div>
      </div>

      {/* Edit form (does NOT submit Active state — that's a separate form below) */}
      <form action={onSubmit} className="mt-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field name="name" label="Name" defaultValue={cat.name} />
          <Field name="title" label="Title" defaultValue={cat.title} />
          <Field
            name="personality"
            label="Personality"
            defaultValue={cat.personality}
          />
          <Field
            name="story_url"
            label="Story URL"
            defaultValue={cat.story_url ?? ""}
          />
          <ImageUrlField defaultValue={cat.image_url} />
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-brown/55">
              Description
            </span>
            <textarea
              name="description"
              defaultValue={cat.description}
              rows={3}
              className="w-full rounded-xl border border-brown/15 bg-white px-3 py-2 text-[13px] text-brown focus:border-brown/40 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brown px-4 py-1.5 text-xs font-semibold text-cream shadow-soft transition hover:bg-brown-400"
          >
            Save changes
          </button>
        </div>
      </form>

      {/* Sibling forms — outside the edit form so the submits are independent
          and the HTML stays valid (no nested <form>). */}
      <div className="mt-3 flex flex-col gap-2 border-t border-brown/8 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          action={async () => {
            "use server";
            await setCatActive(cat.id, !cat.is_active);
          }}
        >
          <button
            type="submit"
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              cat.is_active
                ? "border-brown/15 bg-white/70 text-brown/70 hover:bg-white"
                : "border-mint-dark/30 bg-mint-light/40 text-mint-dark hover:bg-mint-light/60"
            }`}
          >
            {cat.is_active ? (
              <>
                <EyeOff className="h-3.5 w-3.5" strokeWidth={2.4} />
                Hide from public site
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" strokeWidth={2.4} />
                Show on public site
              </>
            )}
          </button>
        </form>

        <DeleteCatForm catId={cat.id} catName={cat.name} />
      </div>
    </div>
  );
}

function DeleteCatForm({
  catId,
  catName,
}: {
  catId: string;
  catName: string;
}) {
  return (
    <form
      action={async () => {
        "use server";
        await deleteCat(catId);
      }}
    >
      <button
        type="submit"
        title={`Permanently delete ${catName} and all their activity`}
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-pink-dark/30 bg-pink-light/30 px-3 py-1.5 text-xs font-semibold text-pink-dark transition hover:bg-pink-light/50"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.4} />
        Delete cat
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  className = "",
}: {
  name: string;
  label: string;
  defaultValue: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-brown/55">
        {label}
      </span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-brown/15 bg-white px-3 py-1.5 text-[13px] text-brown focus:border-brown/40 focus:outline-none"
      />
    </label>
  );
}

function NewCatField({
  name,
  label,
  placeholder,
  className = "",
  required = false,
}: {
  name: string;
  label: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-brown/55">
        {label}
      </span>
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-brown/15 bg-white px-3 py-1.5 text-[13px] text-brown focus:border-brown/40 focus:outline-none"
      />
    </label>
  );
}
