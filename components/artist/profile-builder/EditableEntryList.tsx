"use client";

import type { CareerEntryDraft } from "@/lib/pdf/profileDraft";

const EMPTY_ENTRY: CareerEntryDraft = {
  subtype: "",
  title: "",
  organization: "",
  location: "",
  yearLabel: "",
  description: "",
  url: "",
};

/**
 * A repeatable career-entry list editor for the Artist Profile PDF builder
 * -- visually close to components/artist/CareerEntriesFields.tsx, but
 * driven by plain props/callbacks instead of a hidden form input, since the
 * builder holds its whole draft in ordinary React state rather than
 * submitting a <form>. Edits here only ever touch the builder's own
 * temporary draft (see lib/pdf/profileDraft.ts) -- never the artist's real
 * career-entry rows unless they explicitly save back.
 */
export default function EditableEntryList({
  entries,
  onChange,
  titleLabel = "Title",
  titlePlaceholder,
  organizationLabel = "Organization / venue",
  addLabel = "Add",
  showSubtype = false,
  subtypeOptions = ["Solo", "Group"],
}: {
  entries: CareerEntryDraft[];
  onChange: (next: CareerEntryDraft[]) => void;
  titleLabel?: string;
  titlePlaceholder?: string;
  organizationLabel?: string;
  addLabel?: string;
  showSubtype?: boolean;
  subtypeOptions?: string[];
}) {
  const update = (index: number, patch: Partial<CareerEntryDraft>) => {
    onChange(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };
  const remove = (index: number) => onChange(entries.filter((_, i) => i !== index));
  const add = () => onChange([...entries, { ...EMPTY_ENTRY }]);

  return (
    <div>
      <div className="flex items-center justify-end">
        <button type="button" onClick={add} className="chip-btn shrink-0">
          + {addLabel}
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="border-y border-line py-3 font-sans text-xs text-muted">
          None added yet. Entirely optional, add as many as you like.
        </p>
      ) : (
        <div className="mt-2 space-y-3">
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
    </div>
  );
}
