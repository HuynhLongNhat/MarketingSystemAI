
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

export type CredentialIdentity = {
  organizationId: string;
  connectionId: string;
  provider: string;
};

export type EncryptedCredential = {
  encryptedApiKey: string;
  keyIv: string;
  keyAuthTag: string;
  keyVersion: "v1";
};

function getEncryptionKey(): Buffer {
  const raw = process.env.AI_CREDENTIAL_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error(
      "AI credential encryption key is not configured",
    );
  }

  // Yêu cầu đúng 32 bytes, mã hóa base64 chuẩn.
  const value = raw.trim();

  if (
    !/^[A-Za-z0-9+/]{43}=$/.test(value)
  ) {
    throw new Error(
      "Invalid AI credential encryption key format",
    );
  }

  const key = Buffer.from(value, "base64");

  if (
    key.length !== 32 ||
    key.toString("base64") !== value
  ) {
    throw new Error(
      "AI credential encryption key must be 32 bytes",
    );
  }

  return key;
}

function getAad(identity: CredentialIdentity): Buffer {
  if (
    !identity.organizationId ||
    !identity.connectionId ||
    !identity.provider
  ) {
    throw new Error("Credential identity is incomplete");
  }

  return Buffer.from(
    JSON.stringify([
      "ai-credential",
      "v1",
      identity.organizationId,
      identity.connectionId,
      identity.provider,
    ]),
    "utf8",
  );
}

export function encryptCredential(
  apiKey: string,
  identity: CredentialIdentity,
): EncryptedCredential {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("API key cannot be empty");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    iv,
  );

  cipher.setAAD(getAad(identity));

  const encrypted = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final(),
  ]);

  return {
    encryptedApiKey: encrypted.toString("base64"),
    keyIv: iv.toString("base64"),
    keyAuthTag: cipher.getAuthTag().toString("base64"),
    keyVersion: "v1",
  };
}

export function decryptCredential(
  credential: EncryptedCredential,
  identity: CredentialIdentity,
): string {
  try {
    if (credential.keyVersion !== "v1") {
      throw new Error("Unsupported credential version");
    }

    const iv = Buffer.from(credential.keyIv, "base64");
    const tag = Buffer.from(
      credential.keyAuthTag,
      "base64",
    );
    const ciphertext = Buffer.from(
      credential.encryptedApiKey,
      "base64",
    );

    if (iv.length !== 12 || tag.length !== 16) {
      throw new Error("Invalid encrypted credential");
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      iv,
    );

    decipher.setAAD(getAad(identity));
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch {
    // Không đưa ciphertext, API key hay lỗi crypto
    // chi tiết vào HTTP response hoặc log.
    throw new Error(
      "Unable to decrypt AI provider credential",
    );
  }
}
