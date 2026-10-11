"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  mergeSavedItems,
  removeSavedItem,
  toggleSavedItem,
  updateSavedNote,
} from "@/modules/wishlist/service";
import { isUuid, isWishlistType, type WishlistDraft } from "@/modules/wishlist/rules";

async function userId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sign in to save on your account.");
  return session.user.id;
}

export async function toggleListingAction(entityType: string, entityId: string): Promise<boolean> {
  if (!isWishlistType(entityType) || !isUuid(entityId)) {
    throw new Error("That listing was not found.");
  }
  return toggleSavedItem(await userId(), entityType, entityId);
}

export async function removeListingAction(savedItemId: string): Promise<void> {
  if (!isUuid(savedItemId)) throw new Error("That saved item was not found.");
  await removeSavedItem(await userId(), savedItemId);
}

export async function noteListingAction(savedItemId: string, note: string): Promise<void> {
  if (!isUuid(savedItemId)) throw new Error("That saved item was not found.");
  await updateSavedNote(await userId(), savedItemId, note);
}

export async function saveNoteForm(formData: FormData): Promise<void> {
  await noteListingAction(String(formData.get("id") ?? ""), String(formData.get("note") ?? ""));
  redirect("/wishlist");
}

export async function removeListingForm(formData: FormData): Promise<void> {
  await removeListingAction(String(formData.get("id") ?? ""));
  redirect("/wishlist");
}

export async function mergeWishlistAction(items: WishlistDraft[]): Promise<void> {
  await mergeSavedItems(await userId(), Array.isArray(items) ? items : []);
}
