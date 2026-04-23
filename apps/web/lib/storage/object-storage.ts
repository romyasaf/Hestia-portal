/**
 * S3-compatible uploads — swap credentials or endpoint without changing call sites.
 * Env: S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY (optional prefix)
 */

export type PutObjectInput = {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
};

export interface ObjectStorage {
  putObject(input: PutObjectInput): Promise<{ url: string }>;
}

/** Placeholder until @aws-sdk/client-s3 is wired (keeps vendor swappable). */
export function createObjectStorage(): ObjectStorage {
  return {
    async putObject() {
      throw new Error(
        "S3 client not configured. Install @aws-sdk/client-s3 and implement createObjectStorage() in lib/storage/object-storage.ts"
      );
    }
  };
}
