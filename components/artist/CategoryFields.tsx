"use client";

import { useMemo, useState } from "react";
import { MEDIUM_CATEGORIES } from "@/lib/constants/mediums";

const OTHER_VALUE = "__other__";

/**
 * Category (required) + subcategory/medium (optional) for one artwork,
 * built from the same lib/constants/mediums.ts categories an artist picks
 * their own mediums from on their profile -- one hand-curated vocabulary
 * for both, rather than a second free-text field drifting away from it.
 *
 * Category is a plain <select name="category"> (no custom option --
 * see the "required but not a strict enum" note in
 * lib/validation/artwork.ts for why an out-of-list value can still be
 * submitted and saved). Subcategory follows the same
 * dropdown-plus-"Other" pattern as components/artist/MediumsPicker.tsx:
 * the visible controls carry no `name` of their own, and a single hidden
 * input named "subcategory" carries whichever value is actually in effect,
 * so the server action's FormData reading needs no changes for either an
 * older free-text subcategory or a newly picked one.
 */
export default function CategoryFields({
  defaultCategory,
  defaultSubcategory,
  error,
}: {
  defaultCategory?: string | null;
  defaultSubcategory?: string | null;
  /** Shown under the Category select and highlights its border -- see
   *  ArtworkForm.tsx, which passes state.fieldErrors?.category through
   *  here. Subcategory never has its own error: it's always optional. */
  error?: string;
}) {
  const categoryNames = useMemo(() => MEDIUM_CATEGORIES.map((c) => c.category), []);

  const trimmedDefaultCategory = defaultCategory?.trim() || "";
  const initialCategory = trimmedDefaultCategory || categoryNames[0];
  const isLegacyCategory =
    trimmedDefaultCategory !== "" && !categoryNames.includes(trimmedDefaultCategory);

  const [category, setCategory] = useState(initialCategory);

  const mediumsForCategory = useMemo(
    () => MEDIUM_CATEGORIES.find((c) => c.category === category)?.mediums ?? [],
    [category]
  );

  const trimmedDefaultSubcategory = defaultSubcategory?.trim() || "";
  const initialIsKnownMedium = mediumsForCategory.includes(trimmedDefaultSubcategory);
  const [subcategorySelect, setSubcategorySelect] = useState(
    !trimmedDefaultSubcategory ? "" : initialIsKnownMedium ? trimmedDefaultSubcategory : OTHER_VALUE
  );
  const [customSubcategory, setCustomSubcategory] = useState(
    trimmedDefaultSubcategory && !initialIsKnownMedium ? trimmedDefaultSubcategory : ""
  );

  const effectiveSubcategory =
    subcategorySelect === OTHER_VALUE ? customSubcategory : subcategorySelect;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="field-label" htmlFor="category">
          Category
        </label>
        <select
          id="category"
          name="category"
          required
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setSubcategorySelect("");
            setCustomSubcategory("");
          }}
          className={error ? "border-red-700" : undefined}
        >
          {isLegacyCategory && (
            <option value={initialCategory}>{initialCategory} (existing)</option>
          )}
          {categoryNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {error && <p className="field-error">{error}</p>}
      </div>

      <div>
        <label className="field-label" htmlFor="subcategory-select">
          Medium / subcategory
        </label>
        <select
          id="subcategory-select"
          value={subcategorySelect}
          onChange={(e) => setSubcategorySelect(e.target.value)}
        >
          <option value="">None</option>
          {mediumsForCategory.map((medium) => (
            <option key={medium} value={medium}>
              {medium}
            </option>
          ))}
          <option value={OTHER_VALUE}>Other…</option>
        </select>
        {subcategorySelect === OTHER_VALUE && (
          <input
            type="text"
            value={customSubcategory}
            onChange={(e) => setCustomSubcategory(e.target.value)}
            placeholder="Describe the medium"
            className="mt-2"
          />
        )}
        <input type="hidden" name="subcategory" value={effectiveSubcategory} />
      </div>
    </div>
  );
}
