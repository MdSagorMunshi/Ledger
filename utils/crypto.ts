import { getCryptoApi } from "./runtimeCrypto";

const forge = require("node-forge");

const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(bytes: Uint8Array): string {
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;

    const chunk = (a << 16) | (b << 8) | c;
    output += BASE64_ALPHABET[(chunk >> 18) & 63];
    output += BASE64_ALPHABET[(chunk >> 12) & 63];
    output += i + 1 < bytes.length ? BASE64_ALPHABET[(chunk >> 6) & 63] : "=";
    output += i + 2 < bytes.length ? BASE64_ALPHABET[chunk & 63] : "=";
  }
  return output;
}

function base64ToBytes(base64: string): Uint8Array {
  const normalized = base64.replace(/\s+/g, "");
  if (normalized.length % 4 !== 0) {
    throw new Error("Invalid base64 data");
  }

  const bytes: number[] = [];
  for (let i = 0; i < normalized.length; i += 4) {
    const chars = normalized.slice(i, i + 4);
    const padCount = chars.endsWith("==") ? 2 : chars.endsWith("=") ? 1 : 0;
    const values = chars.split("").map((char) => {
      if (char === "=") return 0;
      const index = BASE64_ALPHABET.indexOf(char);
      if (index === -1) {
        throw new Error("Invalid base64 data");
      }
      return index;
    });

    const chunk =
      (values[0] << 18) |
      (values[1] << 12) |
      (values[2] << 6) |
      values[3];

    bytes.push((chunk >> 16) & 255);
    if (padCount < 2) bytes.push((chunk >> 8) & 255);
    if (padCount < 1) bytes.push(chunk & 255);
  }

  return new Uint8Array(bytes);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

function utf8ToBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function bytesToBinary(bytes: Uint8Array): string {
  let output = "";
  for (let i = 0; i < bytes.length; i++) {
    output += String.fromCharCode(bytes[i]);
  }
  return output;
}

function binaryToBytes(binary: string): Uint8Array {
  const output = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    output[i] = binary.charCodeAt(i);
  }
  return output;
}

function randomBytes(length: number): Uint8Array {
  const cryptoApi = getCryptoApi();
  if (cryptoApi) {
    return cryptoApi.getRandomValues(new Uint8Array(length));
  }
  return binaryToBytes(forge.random.getBytesSync(length));
}

function getSubtleCrypto(): SubtleCrypto | null {
  return getCryptoApi()?.subtle ?? null;
}

async function pinToKey(
  pin: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  if (!subtle) {
    throw new Error("Web Crypto API not available");
  }
  const enc = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    "raw",
    enc.encode(pin) as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function bufferToBase64(buffer: ArrayBuffer): string {
  return bytesToBase64(new Uint8Array(buffer));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const bytes = base64ToBytes(base64);
  return toArrayBuffer(bytes);
}

async function encryptBytesWithWebCrypto(
  bytes: Uint8Array,
  pin: string
): Promise<EncryptedPayload> {
  const subtle = getSubtleCrypto();
  if (!subtle) {
    throw new Error("Web Crypto API not available");
  }
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await pinToKey(pin, salt);
  const encrypted = await subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    bytes as BufferSource
  );
  return {
    salt: bufferToBase64(toArrayBuffer(salt)),
    iv: bufferToBase64(toArrayBuffer(iv)),
    data: bufferToBase64(encrypted),
  };
}

function deriveForgeKey(pin: string, salt: Uint8Array): string {
  return forge.pkcs5.pbkdf2(
    pin,
    bytesToBinary(salt),
    100000,
    32,
    forge.md.sha256.create()
  );
}

async function encryptBytesWithForge(
  bytes: Uint8Array,
  pin: string
): Promise<EncryptedPayload> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveForgeKey(pin, salt);
  const cipher = forge.cipher.createCipher("AES-GCM", key);
  cipher.start({
    iv: bytesToBinary(iv),
    tagLength: 128,
  });
  cipher.update(forge.util.createBuffer(bytesToBinary(bytes)));
  const ok = cipher.finish();
  if (!ok) {
    throw new Error("AES-GCM encryption failed");
  }
  const combined = binaryToBytes(
    cipher.output.getBytes() + cipher.mode.tag.getBytes()
  );
  return {
    salt: bufferToBase64(toArrayBuffer(salt)),
    iv: bufferToBase64(toArrayBuffer(iv)),
    data: bufferToBase64(toArrayBuffer(combined)),
  };
}

async function decryptBytesWithWebCrypto(
  payload: EncryptedPayload,
  pin: string
): Promise<Uint8Array> {
  const subtle = getSubtleCrypto();
  if (!subtle) {
    throw new Error("Web Crypto API not available");
  }
  const salt = new Uint8Array(base64ToBuffer(payload.salt));
  const iv = new Uint8Array(base64ToBuffer(payload.iv));
  const encrypted = base64ToBuffer(payload.data);
  const key = await pinToKey(pin, salt);
  const decrypted = await subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encrypted
  );
  return new Uint8Array(decrypted);
}

async function decryptBytesWithForge(
  payload: EncryptedPayload,
  pin: string
): Promise<Uint8Array> {
  const salt = new Uint8Array(base64ToBuffer(payload.salt));
  const iv = new Uint8Array(base64ToBuffer(payload.iv));
  const combined = new Uint8Array(base64ToBuffer(payload.data));
  if (combined.length < 16) {
    throw new Error("Invalid encrypted payload");
  }

  const ciphertext = combined.slice(0, combined.length - 16);
  const tag = combined.slice(combined.length - 16);
  const key = deriveForgeKey(pin, salt);
  const decipher = forge.cipher.createDecipher("AES-GCM", key);
  decipher.start({
    iv: bytesToBinary(iv),
    tagLength: 128,
    tag: forge.util.createBuffer(bytesToBinary(tag)),
  });
  decipher.update(forge.util.createBuffer(bytesToBinary(ciphertext)));
  const ok = decipher.finish();
  if (!ok) {
    throw new Error("AES-GCM decryption failed");
  }
  return binaryToBytes(decipher.output.getBytes());
}

export interface EncryptedPayload {
  salt: string;
  iv: string;
  data: string;
}

export async function encryptString(
  value: string,
  pin: string
): Promise<EncryptedPayload> {
  const bytes = utf8ToBytes(value);
  if (getSubtleCrypto()) {
    return encryptBytesWithWebCrypto(bytes, pin);
  }
  return encryptBytesWithForge(bytes, pin);
}

export async function decryptString(
  payload: EncryptedPayload,
  pin: string
): Promise<string> {
  try {
    if (getSubtleCrypto()) {
      return bytesToUtf8(await decryptBytesWithWebCrypto(payload, pin));
    }
  } catch {
    // Fall back to forge for payloads created on native devices.
  }
  return bytesToUtf8(await decryptBytesWithForge(payload, pin));
}

export async function encryptData(
  data: object,
  pin: string
): Promise<EncryptedPayload> {
  return encryptString(JSON.stringify(data), pin);
}

export async function decryptData(
  payload: EncryptedPayload,
  pin: string
): Promise<object> {
  return JSON.parse(await decryptString(payload, pin));
}

export function isEncryptedPayload(obj: unknown): obj is EncryptedPayload {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "salt" in obj &&
    "iv" in obj &&
    "data" in obj
  );
}
