"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

/**
 * Image URL input that shows a live preview thumbnail next to the field.
 * Used inside the edit form for each cat — gives the admin instant feedback
 * that the new URL actually resolves to an image before they hit Save.
 */
export default function ImageUrlField({
  name = "image_url",
  defaultValue,
  label = "Image URL",
}: {
  name?: string;
  defaultValue: string;
  label?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [broken, setBroken] = useState(false);

  return (
    <label className="block sm:col-span-2">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-brown/55">
        {label}
      </span>
      <div className="flex items-center gap-2">
        {/* Preview thumb */}
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brown/15 bg-white">
          {!broken && value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={value}
              src={value}
              alt="preview"
              className="h-full w-full object-cover"
              onError={() => setBroken(true)}
              onLoad={() => setBroken(false)}
            />
          ) : (
            <ImageIcon className="h-4 w-4 text-brown/40" strokeWidth={2.2} />
          )}
        </div>
        <input
          name={name}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setBroken(false);
          }}
          className="w-full rounded-xl border border-brown/15 bg-white px-3 py-1.5 text-[13px] text-brown focus:border-brown/40 focus:outline-none"
        />
      </div>
      {broken && value && (
        <span className="mt-1 block text-[11px] text-pink-dark">
          Preview failed — double-check the URL is publicly reachable.
        </span>
      )}
    </label>
  );
}
