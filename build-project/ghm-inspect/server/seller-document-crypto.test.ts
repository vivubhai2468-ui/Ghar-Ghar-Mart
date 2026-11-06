import { beforeEach, describe, expect, it, vi } from "vitest";

describe("seller document encryption", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SELLER_DOCUMENT_ENCRYPTION_KEY = "0123456789abcdef".repeat(4);
  });

  it("encrypts and decrypts document bytes", async () => {
    const { encryptSellerDocument, decryptSellerDocument } = await import("./seller-document-crypto");
    const original = Buffer.from("%PDF-1.7 test seller document");
    const encrypted = encryptSellerDocument(original);
    expect(encrypted.encryptedData.equals(original)).toBe(false);
    expect(decryptSellerDocument(encrypted).equals(original)).toBe(true);
  });

  it("decodes hex-serialized binary metadata returned by SQL adapters", async () => {
    const { encryptSellerDocument, decryptSellerDocument } = await import("./seller-document-crypto");
    const original = Buffer.from("%PDF-1.7 adapter format test");
    const encrypted = encryptSellerDocument(original);
    const serialized = {
      encryptedData: `0x${encrypted.encryptedData.toString("hex")}`,
      iv: `0x${encrypted.iv.toString("hex")}`,
      authTag: `0x${encrypted.authTag.toString("hex")}`,
    };
    expect(decryptSellerDocument(serialized).equals(original)).toBe(true);
  });

  it("reports malformed authentication-tag byte lengths clearly", async () => {
    const { encryptSellerDocument, decryptSellerDocument } = await import("./seller-document-crypto");
    const encrypted = encryptSellerDocument(Buffer.from("document"));
    expect(() => decryptSellerDocument({
      ...encrypted,
      authTag: `0x${encrypted.authTag.toString("hex")}00`,
    })).toThrow(/authentication tag must be 16 bytes/);
  });

  it("rejects ciphertext tampering", async () => {
    const { encryptSellerDocument, decryptSellerDocument } = await import("./seller-document-crypto");
    const encrypted = encryptSellerDocument(Buffer.from("private document"));
    encrypted.encryptedData[0] ^= 0xff;
    expect(() => decryptSellerDocument(encrypted)).toThrow();
  });

  it("rejects a missing or malformed encryption key", async () => {
    process.env.SELLER_DOCUMENT_ENCRYPTION_KEY = "not-a-valid-key";
    const { encryptSellerDocument } = await import("./seller-document-crypto");
    expect(() => encryptSellerDocument(Buffer.from("document"))).toThrow(/SELLER_DOCUMENT_ENCRYPTION_KEY/);
  });
});
