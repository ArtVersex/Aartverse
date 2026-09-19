"use client";

import { useState } from "react";
import type { ArtistCareerEntryRow } from "@/lib/types";

export interface CareerEntryDraft {
  subtype: string;
  title: string;
  organization: string;
  location: string;
  yearLabel: string;
  description: string;
  url: string;
}

function toDraft(row: ArtistCareerEntryRow): CareerEntryDraft {
  return {
    subtype: row.subtype ?? "",
    title: row.title ?? "",
    organization: row.organization ?? "",
    location: row.location ?? "",
    yearLabel: row.year_label ?? "",
    description: row.description ?? "",
    url: row.url ?? "",
  };
}

const emptyDraft: CareerEntryDraft = {
  subtype: "",
  title: "",
  organization: "",
  location: "",
  yearLabel: "",
  description: "",
  url: "",
};

/**
 * One repeatable career-history list -- exhibitions, education, awards,
 * residencies, publications, or institutional collections -- inside the
 * artist Profile form's "Professional profile" section. Every one of these
 * six sections is a separate instance of this same component, storage-
 * unified as one `kind` each in `artist_career_entries` (see
 * lib/queries/artistCareerEntries.ts).
 *
 * Entirely optional: a section can be left with zero rows, and a row with
 * no title is silently dropped on save rather than blocking anything (see
 * lib/validation/auth.ts#parseCareerEntriesField).
 *
 * Follows the same "own React state, one hidden input carries the composed
 * value" convention as CategoryFields/DimensionFields/CollectionFields --
 * here the hidden input carries a JSON-encoded array rather than a single
 * string. Being fully controlled internally (nothing here is a bare
 * defaultValue input), this component is immune to React's
 * form-reset-after-any-action-call behavior without any extra echo-back
 * plumbing -- see ArtworkForm.tsx's doc comment for why that matters.
 */
export default function CareerEntriesFields({
  fieldName,
  label,
  caption,
  addLabel = "Add",
  titleLabel = "Title",
  titlePlaceholder,
  organizationLabel = "Organization / venue",
  defaultEntries,
  showSubtype = false,
  subtypeOptions = ["Solo", "Group"],
}: {
  /** Name of the hidden input -- read back in
   *  app/artist/profile/actions.ts via parseCareerEntriesField. */
  fieldName: string;
  label: string;
  caption?: string;
  addLabel?: string;
  titleLabel?: string;
  titlePlaceholder?: string;
  organizationLabel?: string;
  defaultEntries: ArtistCareerEntryRow[];
  /** Only exhibitions distinguish solo/group today -- see
   *  ArtistCareerEntryRow.subtype's doc comment for why this is a plain
   *  string rather than its own enum. */
  showSubtype?: boolean;
  subtypeOptions?: string[];
}) {
  const [entries, setEntries] = useState<CareerEntryDraft[]>(defaultEntries.map(toDraft));

  const update = (index: number, patch: Partial<CareerEntryDraft>) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };
  const remove = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };
  const add = () => {
    setEntries((prev) => [...prev, { ...emptyDraft }]);
  };

  const jsonValue = JSON.stringify(
    entries.map((e) => ({
      subtype: e.subtype || null,
      title: e.title,
      organization: e.organization || null,
      location: e.location || null,
      yearLabel: e.yearLabel || null,
      description: e.description || null,
      url: e.url || null,
    }))
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="field-label">{label}</span>
        <button type="button" onClick={add} className="chip-btn shrink-0">
          + {addLabel}
        </button>
      </div>
      {caption && <p className="-mt-1 mb-2 font-sans text-xs text-muted">{caption}</p>}

      {entries.length === 0 ? (
        <p className="border-y border-line py-3 font-sans text-xs text-muted">
          None added yet. Entirely optional, add as many as you like.
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div key={index} className="border border-line bg-white p-3 sm:p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label">{titleLabel}</label>
                  <input
                    type="text"
                    value={entry.title}
                    onChange={(e) => update(index, { title: e.target.value })}
                    placeholder={titlePlaceholder}
                  />
                </div>
                <div>
                  <label className="field-label">{organizationLabel}</label>
                  <input
                    type="text"
                    value={entry.organization}
                    onChange={(e) => update(index, { organization: e.target.value })}
                  />
                </div>
              </div>

              <div
                className={`mt-3 grid grid-cols-1 gap-3 ${showSubtype ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
              >
                <div>
                  <label className="field-label">Location</label>
                  <input
                    type="text"
                    value={entry.location}
                    onChange={(e) => update(index, { location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Year</label>
                  <input
                    type="text"
                    value={entry.yearLabel}
                    onChange={(e) => update(index, { yearLabel: e.target.value })}
                    placeholder="e.g. 2023 or 2021-2023"
                  />
                </div>
                {showSubtype && (
                  <div>
                    <label className="field-label">Type</label>
                    <select
                      value={entry.subtype}
                      onChange={(e) => update(index, { subtype: e.target.value })}
                    >
                      <option value="">Not specified</option>
                      {subtypeOptions.map((opt) => (
                        <option key={opt} value={opt.toLowerCase()}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-3">
                <label className="field-label">Link (optional)</label>
                <input
                  type="text"
                  value={entry.url}
                  onChange={(e) => update(index, { url: e.target.value })}
                  placeholder="https://"
                />
              </div>

              <div className="mt-3">
                <label className="field-label">Notes (optional)</label>
                <textarea
                  rows={2}
                  value={entry.description}
                  onChange={(e) => update(index, { description: e.target.value })}
                  className="w-full border border-line bg-transparent p-2.5 font-sans text-sm text-ink focus:outline-none focus:border-ink"
                />
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="chip-btn chip-btn-danger"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input type="hidden" name={fieldName} value={jsonValue} />
    </div>
  );
}
