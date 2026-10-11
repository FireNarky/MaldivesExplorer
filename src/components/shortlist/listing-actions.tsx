import { auth } from "@/auth";
import { CompareButton } from "@/components/shortlist/compare-button";
import { RememberView } from "@/components/shortlist/device-sync";
import { SaveButton } from "@/components/shortlist/save-button";
import { isListingSaved, shortlistLimits } from "@/modules/wishlist/service";
import { isWishlistType, type ViewEntityType } from "@/modules/wishlist/rules";

export async function ListingActions({
  entityType,
  entityId,
  save = false,
  compare = false,
}: {
  entityType: ViewEntityType;
  entityId: string;
  save?: boolean;
  compare?: boolean;
}) {
  const limits = await shortlistLimits();
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  const canSave = save && isWishlistType(entityType);
  const saved = userId && canSave ? await isListingSaved(userId, entityType, entityId) : false;
  return (
    <>
      <RememberView entityType={entityType} entityId={entityId} limit={limits.recent} />
      {canSave ? (
        <SaveButton
          entityType={entityType}
          entityId={entityId}
          signedIn={Boolean(userId)}
          initiallySaved={saved}
        />
      ) : null}
      {compare ? <CompareButton resortId={entityId} /> : null}
    </>
  );
}
