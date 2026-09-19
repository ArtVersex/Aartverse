"use client";

import { useState } from "react";
import type { SocialLink } from "@/lib/types";

const PRESET_LABELS = ["Instagram", "Behance", "LinkedIn", "Facebook", "Twitter / X", "YouTube", "Pinterest"];

/**
 * Repeatable {label, url} list for an artist's social/professional links.
 * Same "own React state, one hidden JSON input" convention as
 * CareerEntriesFields.tsx and, before that, CategoryFields.tsx -- fully
 * controlled internally, so it's immune to React's
 * form-reset-after-any-action-call behavior without extra plumbing.
 *
 * Stored in artists.social_links -- see
 * lib/utils.ts#parseSocialLinks/encodeSocialLinks for the JSON convention,
 * and app/artist/profile/actions.ts for where this hidden input's value
 * gets re-parsed and re-encoded before saving.
 */
export default function SocialLinksFields({
  name,
  defaultValues,
}: {
  name: string;
  defaultValues: SocialLink[];
}) {
  const [links, setLinks] = useState<SocialLink[]>(defaultValues);

  const update = (index: number, patch: Partial<SocialLink>) => {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };
  const remove = (index: number) => setLinks((prev) => prev.filter((_, i) => i !== index));
  const add = () => setLinks((prev) => [...prev, { label: "", url: "" }]);

  const jsonValue = JSON.stringify(links.filter((l) => l.label.trim() && l.url.trim()));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="field-label">Social &amp; professional links</span>
        <button type="button" onClick={add} className="chip-btn shrink-0">
          + Add link
        </button>
      </div>

      {links.length === 0 ? (
        <p className="border-y border-line py-3 font-sans text-xs text-muted">
          None added yet. Entirely optional.
        </p>
      ) : (
        <div className="space-y-2">
          {links.map((link, index) => (
            <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                list="social-link-label-presets"
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

      <datalist id="social-link-label-presets">
        {PRESET_LABELS.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>

      <input type="hidden" name={name} value={jsonValue} />
    </div>
  );
}
