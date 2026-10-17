import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export interface MediaStorage {
  put(key: string, body: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

export function assertStorageKey(key: string): void {
  if (
    !key ||
    key.length > 200 ||
    key.includes("..") ||
    key.includes("\\") ||
    key.includes("@") ||
    key.startsWith("/") ||
    path.isAbsolute(key) ||
    !/^[a-zA-Z0-9._/-]+$/.test(key)
  ) {
    throw new Error("Storage key is not allowed.");
  }
}

export class LocalMediaStorage implements MediaStorage {
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    assertStorageKey(key);
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

export class R2MediaStorage implements MediaStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async put(key: string, body: Uint8Array): Promise<void> {
    assertStorageKey(key);
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body }));
  }

  async get(key: string): Promise<Uint8Array | null> {
    assertStorageKey(key);
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const bytes = await response.Body?.transformToByteArray();
      return bytes ? new Uint8Array(bytes) : null;
    } catch (error) {
      if (error instanceof Error && "name" in error && error.name === "NoSuchKey") return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    assertStorageKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export function r2MediaStorage(): R2MediaStorage {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Object storage is not configured.");
  }
  return new R2MediaStorage(
    new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
    bucket,
  );
}

export function mediaStorage(): MediaStorage {
  const mode = process.env.MEDIA_STORAGE?.trim() || "local";
  const env = process.env.APP_ENV;
  if (mode === "r2") return r2MediaStorage();
  if ((env === "staging" || env === "production") && mode !== "local") {
    throw new Error("Object storage is not configured.");
  }
  if (env === "staging" || env === "production") {
    throw new Error("Local media storage is not allowed in staging or production.");
  }
  const root = process.env.MEDIA_STORAGE_PATH?.trim() || ".data/media";
  return new LocalMediaStorage(root);
}
