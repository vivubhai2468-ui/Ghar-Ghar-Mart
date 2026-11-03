import { beforeEach, describe, expect, it } from "vitest";

describe("seller document encryption", () => {
  beforeEach(() => {
    process.env.SELLER_DOCUMENT_ENCRYPTION_KEY = "0123456789abcdef".repeat(4);
  });

  it("encrypts and decrypts document bytes", async () => {
    const { encryptSellerDocument, decryptSellerDocument } = await import("./seller-document-crypto");
    const original = Buffer.from("%PDF-1.7 test seller document");
    const encrypted = encryptSellerDocument(original);
    expect(encrypted.encryptedData.equals(original)).toBe(false);
    expect(decryptSellerDocument(encrypted).equals(original)).toBe(true);
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
