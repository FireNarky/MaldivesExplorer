import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export interface MediaStorage {
  put(key: string, body: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

export class LocalMediaStorage implements MediaStorage {
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    if (key.includes("..") || path.isAbsolute(key)) {
      throw new Error("Storage key is not allowed.");
    }
    return path.join(this.root, key);
  }

  async put(key: string, body: Uint8Array): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      return await readFile(this.resolve(key));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}

export function mediaStorage(): MediaStorage {
  const root = process.env.MEDIA_STORAGE_PATH?.trim() || ".data/media";
  return new LocalMediaStorage(root);
}
