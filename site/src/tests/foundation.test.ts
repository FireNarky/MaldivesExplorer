import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { permissionCodes, permissionsForRole } from "@/lib/auth/permissions";
import { passwordError } from "@/lib/auth/password";
import { mediaValidationError } from "@/modules/media/service";
import { LocalMediaStorage } from "@/modules/media/storage";
import { decryptSecret, encryptSecret } from "@/lib/auth/mfa";

describe("access matrix", () => {
  it("gives the administrator every permission and keeps audit separate from user management", () => {
    expect(permissionsForRole("ADMINISTRATOR")).toEqual(permissionCodes);
    expect(permissionsForRole("AUDITOR")).toContain("audit.read");
    expect(permissionsForRole("AUDITOR")).not.toContain("user.manage");
    expect(permissionsForRole("CONSULTANT")).not.toContain("catalog.publish");
  });
});

describe("password policy", () => {
  it("rejects a short password", () => {
    expect(passwordError("short")).toBe("Use at least 12 characters.");
    expect(passwordError("long-enough-password")).toBeUndefined();
  });
});

describe("media rules", () => {
  it("accepts a small image and rejects an unknown type", () => {
    expect(mediaValidationError("image/png", 1024)).toBeUndefined();
    expect(mediaValidationError("text/plain", 10)).toBe(
      "Use a JPEG, PNG, WebP, MP4, or WebM file.",
    );
    expect(mediaValidationError("image/jpeg", 16 * 1024 * 1024)).toBe(
      "Images must be 15 MB or smaller.",
    );
    expect(mediaValidationError("image/png", 0)).toBe("Choose a file with content.");
  });

  it("rejects a storage key that leaves the media root", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "maldives-media-"));
    try {
      const storage = new LocalMediaStorage(root);
      await expect(storage.put("../secret", new Uint8Array([1]))).rejects.toThrow(
        "Storage key is not allowed.",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("mfa secret storage", () => {
  it("round-trips a secret without storing it in clear text", () => {
    process.env.AUTH_SECRET = "stage-1-test-secret-with-32-characters";
    const stored = encryptSecret("BASE32SECRET");
    expect(stored).not.toContain("BASE32SECRET");
    expect(decryptSecret(stored)).toBe("BASE32SECRET");
  });
});
