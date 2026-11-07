
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

export interface TokenIdentity {
  organizationId: string;
  connectionId: string;
}

export interface EncryptedGoogleToken {
  encryptedRefreshToken: string;
  refreshTokenIv: string;
  refreshTokenAuthTag: string;
  tokenKeyVersion: string;
}

function encryptionKey(): Buffer {
  const raw =
    process.env.AI_CREDENTIAL_ENCRYPTION_KEY?.trim();

  if (!raw) {
    throw new Error("Credential encryption key missing");
  }

  const key = Buffer.from(raw, "base64");

  if (
    key.length !== 32 ||
    key.toString("base64") !== raw
  ) {
    throw new Error("Invalid encryption key");
  }

  return key;
}

function aad(identity: TokenIdentity): Buffer {
  return Buffer.from(
    JSON.stringify([
      "google-drive-refresh-token",
      "v1",
      identity.organizationId,
      identity.connectionId,
    ]),
    "utf8",
  );
}

export function encryptGoogleToken(
  refreshToken: string,
  identity: TokenIdentity,
): EncryptedGoogleToken {
  if (!refreshToken.trim()) {
    throw new Error("Refresh token cannot be empty");
  }

  const iv = randomBytes(12);

  const cipher = createCipheriv(
    "aes-256-gcm",
    encryptionKey(),
    iv,
  );

  cipher.setAAD(aad(identity));

  const ciphertext = Buffer.concat([
    cipher.update(refreshToken, "utf8"),
    cipher.final(),
  ]);

  return {
    encryptedRefreshToken:
      ciphertext.toString("base64"),
    refreshTokenIv: iv.toString("base64"),
    refreshTokenAuthTag:
      cipher.getAuthTag().toString("base64"),
    tokenKeyVersion: "v1",
  };
}

export function decryptGoogleToken(
  token: EncryptedGoogleToken,
  identity: TokenIdentity,
): string {
  if (token.tokenKeyVersion !== "v1") {
    throw new Error("Unsupported token version");
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(token.refreshTokenIv, "base64"),
    );

    decipher.setAAD(aad(identity));

    decipher.setAuthTag(
      Buffer.from(
        token.refreshTokenAuthTag,
        "base64",
      ),
    );

    return Buffer.concat([
      decipher.update(
        Buffer.from(
          token.encryptedRefreshToken,
          "base64",
        ),
      ),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error(
      "Unable to decrypt Google Drive credential",
    );
  }
}
