export const moduleStatus = "implemented" as const;

export {
  assertTransitionPermission,
  changeDocument,
  requirePermission,
  separationRequired,
  stampOrThrow,
} from "@/modules/publishing/service";
export {
  canPublishCatalog,
  canPublishContent,
  canTransitionWith,
  canWriteCatalog,
  canWriteContent,
} from "@/modules/publishing/policies";
export {
  canTransition,
  editableStatus,
  nextPublishStatuses,
  publicationStamp,
  transitionNeedsPublishPermission,
} from "@/modules/publishing/workflow";
