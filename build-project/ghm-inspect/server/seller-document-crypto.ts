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

type BinaryValue = Buffer | Uint8Array | ArrayBuffer | string;

function describeBinaryValue(value: unknown): string {
  if (value === null) return "type=null";
  if (value === undefined) return "type=undefined";
  if (Buffer.isBuffer(value)) return `type=Buffer length=${value.length}`;
  if (value instanceof Uint8Array) return `type=Uint8Array length=${value.byteLength}`;
  if (value instanceof ArrayBuffer) return `type=ArrayBuffer length=${value.byteLength}`;
  if (Array.isArray(value)) return `type=Array length=${value.length}`;
  if (typeof value === "string") return `type=string length=${value.length}`;
  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const constructorName = objectValue.constructor && typeof objectValue.constructor === "function"
      ? objectValue.constructor.name
      : "unknown";
    const keys = Object.keys(objectValue).slice(0, 8).join(",");
    return `type=object constructor=${constructorName} keys=${keys || "(none)"}`;
  }
  return `type=${typeof value}`;
}

function toStoredBuffer(value: BinaryValue, fieldName: string): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value instanceof ArrayBuffer) return Buffer.from(new Uint8Array(value));

  if (typeof value === "string") {
    // Some SQL adapters expose VARBINARY values as 0x-prefixed hex strings.
    const hex = value.startsWith("0x") ? value.slice(2) : value;
    if (hex.length > 0 && hex.length % 2 === 0 && /^[a-fA-F0-9]+$/.test(hex)) {
      return Buffer.from(hex, "hex");
    }

    // Also accept canonical base64 from adapters that serialize binary columns.
    const base64 = Buffer.from(value, "base64");
    if (base64.length > 0 && base64.toString("base64").replace(/=+$/, "") === value.replace(/=+$/, "")) {
      return base64;
    }
  }

  throw new Error(`Stored seller document ${fieldName} is not in a supported binary format (${describeBinaryValue(value)}). No binary contents were logged.`);
}

export function decryptSellerDocument(input: {
  encryptedData: BinaryValue;
  iv: BinaryValue;
  authTag: BinaryValue;
}): Buffer {
  const encryptedData = toStoredBuffer(input.encryptedData, "ciphertext");
  const iv = toStoredBuffer(input.iv, "initialization vector");
  const authTag = toStoredBuffer(input.authTag, "authentication tag");

  if (iv.length !== 12) {
    throw new Error(`Stored seller document initialization vector must be 12 bytes (received ${iv.length}).`);
  }
  if (authTag.length !== 16) {
    throw new Error(`Stored seller document authentication tag must be 16 bytes (received ${authTag.length}).`);
  }

  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}
