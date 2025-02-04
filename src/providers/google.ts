import { Storage, type Bucket } from "@google-cloud/storage";
import { createHash } from "crypto";
import { GoogleAuthOptions } from "google-auth-library";
import type { Writable } from "stream";
import type { StorageProvider } from "./interface.js";

export type GoogleProviderConfig = {
  prefix?: string;
  domain: string;
  bucket: string;
} & Omit<GoogleAuthOptions, "authClient">;

class GoogleStorageProvider implements StorageProvider {
  bucket: Bucket;

  constructor(config: GoogleProviderConfig) {
    const storage = new Storage(config);
    this.bucket = storage.bucket(config.bucket);
  }

  write(file: string): Writable {
    const fileRef = this.bucket.file(file);
    return fileRef.createWriteStream({
      public: true,
      predefinedAcl: "bucketOwnerFullControl",
      metadata: {
        "file-hash": createHash("md5").update(file).digest("hex"),
      },
    });
  }

  async has(file: string): Promise<boolean> {
    const exists = (await this.bucket.file(file).exists())[0];
    return exists;
  }
}

export default GoogleStorageProvider;
