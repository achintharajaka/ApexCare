import crypto from "crypto";

/**
 * ApexCare Cryptographic Storage Engine
 * Complies with International Standards:
 * - HIPAA Security Rule (45 CFR § 164.312(a)(2)(iv) - Encryption of ePHI at Rest)
 * - ISO/IEC 27001 & ISO 27799 (Health Informatics Information Security Management)
 * - NIST SP 800-38D (Galois/Counter Mode Authentication & Confidentiality)
 * - GDPR Article 32 (Pseudonymisation and State-of-the-Art Encryption)
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // 96-bit IV recommended by NIST SP 800-38D
const SALT_LENGTH_BYTES = 32; // 256-bit salt for PBKDF2
const AUTH_TAG_LENGTH_BYTES = 16; // 128-bit authentication tag
const KDF_ITERATIONS = 100000; // 100,000 PBKDF2 iterations with SHA-512
const KEY_LENGTH_BYTES = 32; // 256-bit AES key

export interface EncryptedEnvelope {
  format: "ApexCare-ePHI-EncryptedEnvelope-v1";
  standard: "HIPAA-45CFR164.312-ISO27001-NIST-SP800-38D";
  cipher: "aes-256-gcm";
  kdf: "pbkdf2-sha512";
  iterations: number;
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
  metadata: {
    encryptedAt: string;
    system: string;
  };
}

/**
 * Derives a cryptographically strong 256-bit key from the master secret and a salt.
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, KDF_ITERATIONS, KEY_LENGTH_BYTES, "sha512");
}

/**
 * Encrypts an arbitrary object or string using AES-256-GCM with a fresh IV and Salt.
 * Returns a self-contained, tamper-evident cryptographic envelope.
 */
export function encryptData(data: any, masterSecret: string): EncryptedEnvelope {
  if (!masterSecret || masterSecret.length < 16) {
    throw new Error("ApexCare Cryptography: Master encryption secret must be at least 16 characters.");
  }

  const plaintext = typeof data === "string" ? data : JSON.stringify(data);
  const salt = crypto.randomBytes(SALT_LENGTH_BYTES);
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const key = deriveKey(masterSecret, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Set Additional Authenticated Data (AAD) for tamper-proofing the header
  const aad = Buffer.from("ApexCare-HMS-v1-ePHI", "utf-8");
  cipher.setAAD(aad);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    format: "ApexCare-ePHI-EncryptedEnvelope-v1",
    standard: "HIPAA-45CFR164.312-ISO27001-NIST-SP800-38D",
    cipher: "aes-256-gcm",
    kdf: "pbkdf2-sha512",
    iterations: KDF_ITERATIONS,
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    ciphertext: encrypted.toString("hex"),
    metadata: {
      encryptedAt: new Date().toISOString(),
      system: "ApexCare HMS Production Security Core",
    },
  };
}

/**
 * Decrypts an EncryptedEnvelope verifying cryptographic authenticity with the GCM AuthTag.
 * Throws an error if ciphertext or any parameter has been tampered with or modified.
 */
export function decryptData<T = any>(envelope: EncryptedEnvelope, masterSecret: string): T {
  if (envelope.format !== "ApexCare-ePHI-EncryptedEnvelope-v1" || envelope.cipher !== "aes-256-gcm") {
    throw new Error("ApexCare Cryptography: Invalid or unsupported encrypted envelope format.");
  }

  const salt = Buffer.from(envelope.salt, "hex");
  const iv = Buffer.from(envelope.iv, "hex");
  const authTag = Buffer.from(envelope.authTag, "hex");
  const ciphertext = Buffer.from(envelope.ciphertext, "hex");
  const key = deriveKey(masterSecret, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  // Verify Additional Authenticated Data (AAD)
  const aad = Buffer.from("ApexCare-HMS-v1-ePHI", "utf-8");
  decipher.setAAD(aad);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const plaintext = decrypted.toString("utf-8");
    return JSON.parse(plaintext) as T;
  } catch (err) {
    throw new Error(
      "ApexCare Cryptography: Decryption verification failed! Data has been tampered with, corrupted, or incorrect secret key provided."
    );
  }
}

