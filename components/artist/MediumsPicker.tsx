"use client";

import { useId, useMemo, useState } from "react";
import { MEDIUM_CATEGORIES, ALL_PREDEFINED_MEDIUMS } from "@/lib/constants/mediums";

interface MediumsPickerProps {
  /** Form field name the final comma-separated selection is submitted
   *  under -- the server action (app/artist/profile/actions.ts) parses
   *  this exactly the way it always has (see lib/utils.ts), so nothing
   *  downstream of the hidden input needed to change for this picker. */
  name: string;
  /** Already-parsed starting selection, e.g. parseCommaList(artist?.mediums). */
  defaultValues: string[];
}

/**
 * Multi-select for an artist's mediums: checkboxes grouped by the type of
 * work (Painting, Print Making, Drawing, Sculpture, Mixed Media -- see
 * lib/constants/mediums.ts), plus a free-text "Other" field for anything
 * not on that finite list. Every selection (predefined or custom) ends up
 * in one comma-separated hidden input, so the rest of the app never has
 * to know the difference.
 */
export default function MediumsPicker({ name, defaultValues }: MediumsPickerProps) {
  const [selected, setSelected] = useState<string[]>(defaultValues);
  const [otherInput, setOtherInput] = useState("");
  const idPrefix = useId();

  // Anything already saved that isn't one of our predefined mediums is a
  // custom entry -- either added here before, or typed into the old
  // plain-text mediums field before this picker existed. Shown as its own
  // removable chip instead of being silently dropped.
  const customSelected = useMemo(
    () => selected.filter((m) => !ALL_PREDEFINED_MEDIUMS.has(m)),
    [selected]
  );

  function toggle(medium: string) {
    setSelected((prev) =>
      prev.includes(medium) ? prev.filter((m) => m !== medium) : [...prev, medium]
    );
  }

  function addOther() {
    const value = otherInput.trim();
    if (!value) return;
    setSelected((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setOtherInput("");
  }

  function remove(medium: string) {
    setSelected((prev) => prev.filter((m) => m !== medium));
  }

  return (
    <div>
      <input type="hidden" name={name} value={selected.join(", ")} />

      <div className="space-y-4">
        {MEDIUM_CATEGORIES.map((group) => (
          <div key={group.category}>
            <p className="eyebrow mb-2">{group.category}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {group.mediums.map((medium) => {
                const id = `${idPrefix}-${medium.replace(/[^a-zA-Z0-9]+/g, "-")}`;
                const checked = selected.includes(medium);
                return (
                  <label
                    key={medium}
                    htmlFor={id}
                    className="flex cursor-pointer items-center gap-2 font-sans text-sm text-ink"
                  >
                    <input
                      id={id}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(medium)}
                      className="h-4 w-4 shrink-0 border-line accent-ink"
                    />
                    {medium}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="eyebrow mb-2">Other</p>
        {customSelected.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {customSelected.map((medium) => (
              <span
                key={medium}
                className="inline-flex items-center gap-2 border border-line px-2.5 py-1 font-sans text-xs text-ink"
              >
                {medium}
                <button
                  type="button"
                  onClick={() => remove(medium)}
                  aria-label={`Remove ${medium}`}
                  className="text-muted hover:text-ink"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={otherInput}
            onChange={(e) => setOtherInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOther();
              }
            }}
            placeholder="Add a medium not listed above"
            className="flex-1"
          />
          <button type="button" onClick={addOther} className="btn-secondary shrink-0 !px-4 !py-2">
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
