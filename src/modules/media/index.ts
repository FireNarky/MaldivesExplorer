export const moduleStatus = "implemented" as const;

export { mediaValidationError, storeMedia } from "@/modules/media/service";
export type { StoredMedia } from "@/modules/media/service";
export { LocalMediaStorage, mediaStorage } from "@/modules/media/storage";
export type { MediaStorage } from "@/modules/media/storage";
