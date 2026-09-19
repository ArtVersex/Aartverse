"use client";

import { useActionState } from "react";
import {
  updateWeekBestCollectionAction,
  type CollectionFormState,
} from "@/app/admin/week-best/actions";
import type { WeekBestCollectionRow } from "@/lib/types";

// Declared locally rather than imported -- a "use server" file (see
// app/admin/week-best/actions.ts) can only export async functions, so the
// initial state object for useActionState lives here instead, same as
// every other useActionState form in this codebase.
const initialState: CollectionFormState = {};

export default function EditCollectionForm({
  collection,
  artists,
}: {
  collection: WeekBestCollectionRow;
  artists: Array<{ artist_id: string; name: string }>;
}) {
  const boundAction = updateWeekBestCollectionAction.bind(null, collection.week_best_collection_id);
  const [state, formAction, isPending] = useActionState<CollectionFormState, FormData>(
    boundAction,
    initialState
  );

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="eyebrow text-[11px]">Collection name *</span>
        <input
          name="collectionName"
          required
          defaultValue={collection.collection_name}
          className="border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none"
        />
        {state.fieldErrors?.collectionName && (
          <span className="text-xs text-red-700">{state.fieldErrors.collectionName}</span>
        )}
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="eyebrow text-[11px]">Week of</span>
        <input
          type="date"
          name="weekOf"
          defaultValue={collection.week_of ?? ""}
          className="border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="eyebrow text-[11px]">Featuring artist</span>
        <select
          name="artistId"
          defaultValue={collection.artist_id ?? ""}
          className="border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none"
        >
          <option value="">None</option>
          {artists.map((a) => (
            <option key={a.artist_id} value={a.artist_id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="eyebrow text-[11px]">Label</span>
        <input
          name="label"
          defaultValue={collection.label ?? ""}
          className="border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="eyebrow text-[11px]">Headline</span>
        <input
          name="headline"
          defaultValue={collection.headline ?? ""}
          className="border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none"
        />
      </label>

      <div className="sm:col-span-2">
        <button type="submit" disabled={isPending} className="btn-accent">
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
