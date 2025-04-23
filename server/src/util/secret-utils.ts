import crypto from "crypto";

/**
 * Generates a random 8-character share ID.
 * @returns The generated share ID.
 */
export const generateShareId = (): string => {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let shareId = "";
  for (let i = 0; i < 8; i++) {
    shareId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return shareId;
};

/**
 * Fragments a secret into smaller parts.
 * @param secret The secret to fragment.
 * @param fragmentSize The size of each fragment (default: 50).
 * @returns An array of secret fragments.
 */
export const fragmentSecret = (
  secret: string,
  fragmentSize: number = 50
): string[] => {
  const fragments: string[] = [];
  for (let i = 0; i < secret.length; i += fragmentSize) {
    fragments.push(secret.substring(i, i + fragmentSize));
  }
  return fragments;
};

/**
 * Encrypts a fragment using AES-256-CBC.
 * @param fragment The fragment to encrypt.
 * @param key The encryption key.
 * @returns The encrypted fragment.
 */
export const encryptFragment = (fragment: string, key: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), iv);
  let encrypted = cipher.update(fragment);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

/**
 * Decrypts an encrypted fragment using AES-256-CBC.
 * @param encryptedFragment The encrypted fragment to decrypt.
 * @param key The encryption key.
 * @returns The decrypted fragment.
 */
export const decryptFragment = (
  encryptedFragment: string,
  key: string
): string => {
  const [iv, encrypted] = encryptedFragment.split(":");
  const ivBuffer = Buffer.from(iv, "hex");
  const encryptedText = Buffer.from(encrypted, "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(key),
    ivBuffer
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

/**
 * Gets the symmetric encryption key.
 *
 * Assumes that the key is stored in an environment variable. But can be leveraged to call out to a third-party
 * system to retrieve the key.
 *
 * Note: The key must be exactly 32 bytes long for AES-256-CBC.
 *
 * @returns The symmetric encryption key.
 */
export const getSymmetricEncryptionKey = (): string => {
  // Assuming we have access to a key
  const encryptionKey =
    (process.env.ENCRYPTION_KEY as string) || "default_encryption_key";

  if (encryptionKey.length < 32) {
    return encryptionKey.padEnd(32, "\0");
  } else if (encryptionKey.length > 32) {
    return encryptionKey.substring(0, 32);
  }

  return encryptionKey;
};
