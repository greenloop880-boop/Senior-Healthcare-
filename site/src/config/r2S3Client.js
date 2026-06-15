import { S3Client } from "@aws-sdk/client-s3";

// Note: This client should ONLY be used in a server-side environment (Node.js backend, Next.js API route, etc.)
// Do NOT use this in the browser (React components) as it will expose your secret keys.

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

export const r2ServerClient = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
});
