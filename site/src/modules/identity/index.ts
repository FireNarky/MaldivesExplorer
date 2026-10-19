export const moduleStatus = "implemented" as const;

export {
  assignRole,
  isStaffUser,
  permissionsForUser,
  userHasPermission,
} from "@/modules/identity/service";
