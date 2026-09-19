"use client";

import type { SocialLink } from "@/lib/types";

const PRESET_LABELS = ["Instagram", "Behance", "LinkedIn", "Facebook", "Twitter / X", "YouTube", "Pinterest"];

/**
 * Callback-driven twin of components/artist/SocialLinksFields.tsx, for the
 * Artist Profile PDF builder -- the builder holds its whole draft in plain
 * React state rather than submitting a <form>, so there's no hidden input
 * to carry a value; the parent (ArtistProfileBuilder.tsx) owns the list and
 * this just renders it plus edit/add/remove controls.
 */
export default function SocialLinksEditor({
  value,
  onChange,
}: {
  value: SocialLink[];
  onChange: (next: SocialLink[]) => void;
}) {
  const update = (index: number, patch: Partial<SocialLink>) => {
    onChange(value.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const add = () => onChange([...value, { label: "", url: "" }]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="field-label">Social &amp; professional links</span>
        <button type="button" onClick={add} className="chip-btn shrink-0">
          + Add link
        </button>
      </div>

      {value.length === 0 ? (
        <p className="border-y border-line py-3 font-sans text-xs text-muted">None added yet.</p>
      ) : (
        <div className="space-y-2">
          {value.map((link, index) => (
            <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                list="profile-builder-social-label-presets"
                value={link.label}
                onChange={(e) => update(index, { label: e.target.value })}
                placeholder="Label, e.g. Instagram"
                className="sm:w-48"
              />
              <input
                type="url"
                value={link.url}
                onChange={(e) => update(index, { url: e.target.value })}
                placeholder="https://"
                className="min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="chip-btn chip-btn-danger shrink-0 self-start sm:self-auto"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <datalist id="profile-builder-social-label-presets">
        {PRESET_LABELS.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
    </div>
  );
}
