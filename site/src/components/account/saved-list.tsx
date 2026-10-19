import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logError } from "@/lib/observability/log";
import { removeListingForm, saveNoteForm } from "@/modules/wishlist/actions";
import { wishlistNoteLimit } from "@/modules/wishlist/rules";
import { listSavedItems } from "@/modules/wishlist/service";

export async function SavedAccountList({ userId }: { userId: string }) {
  try {
    const items = await listSavedItems(userId);
    if (items.length === 0) {
      return (
        <EmptyState title="Saved items">
          <p>Nothing is saved on this account.</p>
          <Link href="/resorts" className="font-semibold text-lagoon-ink">
            Resorts
          </Link>
        </EmptyState>
      );
    }
    return (
      <ul className="grid gap-6">
        {items.map((item) => (
          <li key={item.savedItemId ?? item.entityId} className="grid max-w-[65ch] gap-3">
            {item.available && item.href && item.name ? (
              <Link href={item.href} className="font-semibold text-lagoon-ink">
                {item.name}
              </Link>
            ) : item.available && item.name ? (
              <p>{item.name}</p>
            ) : (
              <p>This listing is not currently published.</p>
            )}
            {item.summary ? <p>{item.summary}</p> : null}
            {item.savedItemId ? (
              <>
                <form action={saveNoteForm} className="grid gap-2">
                  <input type="hidden" name="id" value={item.savedItemId} />
                  <Label htmlFor={`note-${item.savedItemId}`}>
                    Note <span className="font-normal">Optional</span>
                  </Label>
                  <Textarea
                    id={`note-${item.savedItemId}`}
                    name="note"
                    maxLength={wishlistNoteLimit}
                    defaultValue={item.note}
                  />
                  <Button type="submit" variant="secondary">
                    Save note
                  </Button>
                </form>
                <form action={removeListingForm}>
                  <input type="hidden" name="id" value={item.savedItemId} />
                  <Button type="submit" variant="secondary">
                    Remove
                  </Button>
                </form>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "Saved items could not be loaded.");
    return (
      <ErrorState title="Saved">
        <p>Saved items could not be loaded.</p>
      </ErrorState>
    );
  }
}
