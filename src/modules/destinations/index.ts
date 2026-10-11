export const moduleStatus = "implemented" as const;

export {
  listAtollOptions,
  listAtolls,
  listIslands,
  getAtoll,
  getIsland,
} from "@/modules/destinations/repository";
export {
  saveAtoll,
  saveIsland,
  transitionAtoll,
  transitionIsland,
} from "@/modules/destinations/service";
