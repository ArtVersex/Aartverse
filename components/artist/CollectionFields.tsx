"use client";

import { useState } from "react";

const CREATE_NEW_VALUE = "__new__";

/**
 * "Is this artwork part of a collection or series?" Mirrors
 * CategoryFields.tsx's dropdown-plus-"Other" shape: the visible controls
 * carry no `name` of their own, and two hidden inputs ("partOfCollection",
 * "collectionName") carry whatever's actually in effect, so the server
 * action's FormData reading needs no changes.
 *
 * `existingCollections` is this artist's own distinct collection names,
 * across every status (see
 * lib/queries/artworkMutations.ts#getArtistCollectionNames), fetched
 * server-side and passed in as a plain prop -- this component has no DB
 * access of its own. When there are none yet, "Yes" goes straight to a
 * free-text box; when there are some, "Yes" offers a dropdown of them
 * first (to avoid near-duplicate series names like "Monsoon" vs "Monsoon
 * Series") plus a "Create new collection" option that reveals the same
 * free-text box.
 */
export default function CollectionFields({
  existingCollections,
  defaultPartOfCollection,
  defaultCollectionName,
  error,
}: {
  existingCollections: string[];
  defaultPartOfCollection?: boolean;
  defaultCollectionName?: string | null;
  error?: string;
}) {
  const hasExisting = existingCollections.length > 0;
  const trimmedDefaultName = defaultCollectionName?.trim() || "";
  const defaultIsKnown = trimmedDefaultName !== "" && existingCollections.includes(trimmedDefaultName);

  const [isPart, setIsPart] = useState(Boolean(defaultPartOfCollection));
  const [mode, setMode] = useState<"select" | "new">(
    hasExisting && (defaultIsKnown || !trimmedDefaultName) ? "select" : "new"
  );
  const [selected, setSelected] = useState(
    defaultIsKnown ? trimmedDefaultName : hasExisting ? existingCollections[0] : ""
  );
  const [customName, setCustomName] = useState(!defaultIsKnown ? trimmedDefaultName : "");

  const effectiveName = !isPart ? "" : mode === "select" ? selected : customName.trim();

  return (
    <div>
      <span className="field-label">Part of a collection or series?</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsPart(false)}
          aria-pressed={!isPart}
          className={`chip-toggle ${!isPart ? "chip-toggle-active" : ""}`}
        >
          No
        </button>
        <button
          type="button"
          onClick={() => setIsPart(true)}
          aria-pressed={isPart}
          className={`chip-toggle ${isPart ? "chip-toggle-active" : ""}`}
        >
          Yes
        </button>
      </div>

      {isPart && (
        <div className="mt-3">
          {mode === "select" ? (
            <>
              <label className="field-label" htmlFor="collection-select">
                Which collection?
              </label>
              <select
                id="collection-select"
                value={selected}
                onChange={(e) => {
                  if (e.target.value === CREATE_NEW_VALUE) {
                    setMode("new");
                  } else {
                    setSelected(e.target.value);
                  }
                }}
              >
                {existingCollections.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                <option value={CREATE_NEW_VALUE}>+ Create new collection…</option>
              </select>
            </>
          ) : (
            <>
              <label className="field-label" htmlFor="collection-new">
                {hasExisting ? "New collection name" : "Collection or series name"}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="collection-new"
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Monsoon Series"
                  className="min-w-0 flex-1"
                />
                {hasExisting && (
                  <button type="button" onClick={() => setMode("select")} className="chip-btn shrink-0">
                    Choose existing
                  </button>
                )}
              </div>
            </>
          )}
          {error && <p className="field-error">{error}</p>}
        </div>
      )}

      <input type="hidden" name="partOfCollection" value={isPart ? "1" : "0"} />
      <input type="hidden" name="collectionName" value={effectiveName} />
    </div>
  );
}
