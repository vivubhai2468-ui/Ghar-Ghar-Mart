import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ENV } from "./_core/env";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const value = ENV.sellerDocumentEncryptionKey.trim();
  if (!/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error("Seller document storage is not configured. Set SELLER_DOCUMENT_ENCRYPTION_KEY to a 32-byte (64-character hex) secret.");
  }
  return Buffer.from(value, "hex");
}

export function encryptSellerDocument(plaintext: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encryptedData = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { encryptedData, iv, authTag: cipher.getAuthTag() };
}

export function decryptSellerDocument(input: { encryptedData: Buffer; iv: Buffer; authTag: Buffer }): Buffer {
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(input.iv));
  decipher.setAuthTag(Buffer.from(input.authTag));
  return Buffer.concat([decipher.update(Buffer.from(input.encryptedData)), decipher.final()]);
}
