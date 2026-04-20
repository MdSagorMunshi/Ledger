type CryptoApi = Crypto & {
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
};

function isCryptoApi(value: unknown): value is CryptoApi {
  return (
    typeof value === "object" &&
    value !== null &&
    "subtle" in value &&
    typeof (value as CryptoApi).getRandomValues === "function"
  );
}

export function getCryptoApi(): CryptoApi | null {
  if (typeof globalThis !== "undefined" && isCryptoApi(globalThis.crypto)) {
    return globalThis.crypto;
  }
  if (
    typeof global !== "undefined" &&
    isCryptoApi((global as { crypto?: unknown }).crypto)
  ) {
    return (global as { crypto: CryptoApi }).crypto;
  }
  return null;
}

export function getSubtleCrypto(): SubtleCrypto {
  const cryptoApi = getCryptoApi();
  if (!cryptoApi?.subtle) {
    throw new Error("Web Crypto API not available");
  }
  return cryptoApi.subtle;
}

export function randomBytes(length: number): Uint8Array {
  const cryptoApi = getCryptoApi();
  if (!cryptoApi) {
    throw new Error("Crypto API not available");
  }
  return cryptoApi.getRandomValues(new Uint8Array(length));
}
