"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import {
  addArtworkToWeekBestCollection,
  createWeekBestCollection,
  deleteWeekBestCollection,
  moveWeekBestCollectionArtwork,
  removeArtworkFromWeekBestCollection,
  updateWeekBestCollection,
  type WeekBestCollectionInput,
} from "@/lib/queries/weekBest";

export interface CollectionFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Every place that touches a Week Best Collection also revalidates the
 *  public pages that read it -- the home page's Week Best band
 *  (getLatestWeekBestCollection), the collection index, and this one
 *  collection's own detail page -- rather than waiting out their 300s ISR
 *  window, same reasoning as the admin featured/impactful toggles
 *  revalidating "/" directly. */
function revalidateWeekBestPaths(collectionId?: string) {
  revalidatePath("/admin/week-best");
  revalidatePath("/week-best");
  revalidatePath("/");
  if (collectionId) {
    revalidatePath(`/admin/week-best/${collectionId}`);
    revalidatePath(`/week-best/${collectionId}`);
  }
}

function readCollectionForm(formData: FormData): WeekBestCollectionInput {
  const collectionName = String(formData.get("collectionName") ?? "").trim();
  const weekOf = String(formData.get("weekOf") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  const artistId = String(formData.get("artistId") ?? "").trim();
  return {
    collectionName,
    weekOf: weekOf || null,
    label: label || null,
    headline: headline || null,
    artistId: artistId || null,
  };
}

export async function createWeekBestCollectionAction(
  _prevState: CollectionFormState,
  formData: FormData
): Promise<CollectionFormState> {
  await requireAdmin();
  const values = readCollectionForm(formData);
  if (!values.collectionName) {
    return { fieldErrors: { collectionName: "Give this collection a name." } };
  }

  const id = await createWeekBestCollection(values);
  revalidateWeekBestPaths(id);
  redirect(`/admin/week-best/${id}`);
}

export async function updateWeekBestCollectionAction(
  collectionId: string,
  _prevState: CollectionFormState,
  formData: FormData
): Promise<CollectionFormState> {
  await requireAdmin();
  const values = readCollectionForm(formData);
  if (!values.collectionName) {
    return { fieldErrors: { collectionName: "Give this collection a name." } };
  }

  await updateWeekBestCollection(collectionId, values);
  revalidateWeekBestPaths(collectionId);
  return {};
}

export async function deleteWeekBestCollectionAction(collectionId: string): Promise<void> {
  await requireAdmin();
  await deleteWeekBestCollection(collectionId);
  revalidateWeekBestPaths(collectionId);
  redirect("/admin/week-best");
}

export async function addArtworkToCollectionAction(
  collectionId: string,
  artworkId: string
): Promise<void> {
  await requireAdmin();
  if (!artworkId) return;
  await addArtworkToWeekBestCollection(collectionId, artworkId);
  revalidateWeekBestPaths(collectionId);
}

export async function removeArtworkFromCollectionAction(
  collectionId: string,
  artworkId: string
): Promise<void> {
  await requireAdmin();
  await removeArtworkFromWeekBestCollection(collectionId, artworkId);
  revalidateWeekBestPaths(collectionId);
}

export async function moveArtworkInCollectionAction(
  collectionId: string,
  artworkId: string,
  direction: "up" | "down"
): Promise<void> {
  await requireAdmin();
  await moveWeekBestCollectionArtwork(collectionId, artworkId, direction);
  revalidateWeekBestPaths(collectionId);
}
