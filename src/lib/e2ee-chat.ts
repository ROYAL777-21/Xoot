export const E2EE_CHAT_PREFIX = "xoot:e2ee:v1:";

const CHAT_ALGORITHM = "ECDH-P256+HKDF-SHA256/AES-GCM" as const;
const DEVICE_KEY_VERSION = 1;

export type StoredDeviceKeyPair = {
  deviceId: string;
  keyVersion: number;
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
  createdAt: string;
};

export type E2eeRecipientKey = {
  userId: string;
  deviceId: string;
  publicJwk: JsonWebKey;
  publicKeyId?: string;
  keyVersion?: number;
};

type WrappedMessageKey = {
  userId: string;
  deviceId: string;
  publicKeyId?: string;
  keyVersion?: number;
  iv: string;
  wrappedKey: string;
};

export type E2eeChatEnvelope = {
  v: 1;
  alg: typeof CHAT_ALGORITHM;
  senderId: string;
  senderDeviceId: string;
  senderPublicJwk: JsonWebKey;
  bookingId: string;
  createdAt: string;
  message: {
    iv: string;
    ciphertext: string;
  };
  keys: WrappedMessageKey[];
};

export type EncryptChatMessageInput = {
  plaintext: string;
  bookingId: string;
  senderId: string;
  senderDeviceId: string;
  senderPrivateJwk: JsonWebKey;
  senderPublicJwk: JsonWebKey;
  recipients: E2eeRecipientKey[];
};

export type DecryptChatMessageInput = {
  body: string;
  currentUserId: string;
  currentDeviceId?: string;
  privateJwk: JsonWebKey;
};

const encodeText = (value: string) => new TextEncoder().encode(value);
const decodeText = (value: BufferSource) => new TextDecoder().decode(value);

const getCrypto = () => {
  if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues) {
    throw new Error("Secure chat requires Web Crypto support.");
  }
  return globalThis.crypto;
};

const randomBytes = (length: number) => {
  const bytes = new Uint8Array(length);
  getCrypto().getRandomValues(bytes);
  return bytes;
};

const randomDeviceId = () => {
  const cryptoRef = getCrypto();
  return cryptoRef.randomUUID?.() ?? bytesToBase64Url(randomBytes(16));
};

export const isE2eeSupported = () => {
  return Boolean(
    globalThis.crypto?.subtle &&
      globalThis.crypto.getRandomValues &&
      typeof TextEncoder !== "undefined" &&
      typeof TextDecoder !== "undefined",
  );
};

export const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const base64UrlToBytes = (value: string) => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const encodeJson = (value: unknown) => bytesToBase64Url(encodeText(JSON.stringify(value)));

const decodeJson = <T>(value: string): T => JSON.parse(decodeText(base64UrlToBytes(value))) as T;

const toUint8Array = (buffer: ArrayBuffer) => new Uint8Array(buffer);

const importPrivateKey = (privateJwk: JsonWebKey) =>
  getCrypto().subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"],
  );

const importPublicKey = (publicJwk: JsonWebKey) =>
  getCrypto().subtle.importKey(
    "jwk",
    publicJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

const importAesKey = (rawKey: BufferSource, usages: KeyUsage[]) =>
  getCrypto().subtle.importKey("raw", rawKey, { name: "AES-GCM", length: 256 }, false, usages);

const deriveWrapKey = async ({
  privateKey,
  publicKey,
  bookingId,
  senderId,
  senderDeviceId,
  recipientId,
  recipientDeviceId,
}: {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  bookingId: string;
  senderId: string;
  senderDeviceId: string;
  recipientId: string;
  recipientDeviceId: string;
}) => {
  const cryptoRef = getCrypto();
  const sharedBits = await cryptoRef.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
  const hkdfKey = await cryptoRef.subtle.importKey("raw", sharedBits, "HKDF", false, ["deriveKey"]);

  return cryptoRef.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encodeText(`xoot-chat-v1:${bookingId}:${senderId}:${recipientId}:${recipientDeviceId}`),
      info: encodeText(`message-key:${senderDeviceId}->${recipientDeviceId}`),
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

export const createDeviceKeyPair = async (deviceId = randomDeviceId()): Promise<StoredDeviceKeyPair> => {
  const keyPair = await getCrypto().subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  return {
    deviceId,
    keyVersion: DEVICE_KEY_VERSION,
    publicJwk: await getCrypto().subtle.exportKey("jwk", keyPair.publicKey),
    privateJwk: await getCrypto().subtle.exportKey("jwk", keyPair.privateKey),
    createdAt: new Date().toISOString(),
  };
};

export const getDeviceKeyStorageKey = (userId: string) => `xoot:e2ee:device-key:v1:${userId}`;

export const readStoredDeviceKeyPair = (userId: string, storage?: Storage | null): StoredDeviceKeyPair | null => {
  const targetStorage = storage ?? (typeof window !== "undefined" ? window.localStorage : null);
  const raw = targetStorage?.getItem(getDeviceKeyStorageKey(userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredDeviceKeyPair;
    if (!parsed.deviceId || !parsed.privateJwk || !parsed.publicJwk) return null;
    return parsed;
  } catch {
    targetStorage?.removeItem(getDeviceKeyStorageKey(userId));
    return null;
  }
};

export const writeStoredDeviceKeyPair = (
  userId: string,
  keyPair: StoredDeviceKeyPair,
  storage?: Storage | null,
) => {
  const targetStorage = storage ?? (typeof window !== "undefined" ? window.localStorage : null);
  targetStorage?.setItem(getDeviceKeyStorageKey(userId), JSON.stringify(keyPair));
};

export const getOrCreateStoredDeviceKeyPair = async (userId: string, storage?: Storage | null) => {
  const stored = readStoredDeviceKeyPair(userId, storage);
  if (stored) return stored;
  const created = await createDeviceKeyPair();
  writeStoredDeviceKeyPair(userId, created, storage);
  return created;
};

export const isEncryptedChatBody = (body: string) => body.startsWith(E2EE_CHAT_PREFIX);

export const serialiseChatEnvelope = (envelope: E2eeChatEnvelope) => `${E2EE_CHAT_PREFIX}${encodeJson(envelope)}`;

export const parseEncryptedChatBody = (body: string): E2eeChatEnvelope | null => {
  if (!isEncryptedChatBody(body)) return null;

  try {
    const envelope = decodeJson<E2eeChatEnvelope>(body.slice(E2EE_CHAT_PREFIX.length));
    if (envelope.v !== 1 || envelope.alg !== CHAT_ALGORITHM || !Array.isArray(envelope.keys)) return null;
    return envelope;
  } catch {
    return null;
  }
};

export const getMissingRecipientIds = (participantIds: string[], recipientKeys: E2eeRecipientKey[]) => {
  const available = new Set(recipientKeys.map((key) => key.userId));
  return participantIds.filter((participantId) => !available.has(participantId));
};

export const encryptChatMessage = async ({
  plaintext,
  bookingId,
  senderId,
  senderDeviceId,
  senderPrivateJwk,
  senderPublicJwk,
  recipients,
}: EncryptChatMessageInput) => {
  if (!plaintext.trim()) throw new Error("Secure chat message cannot be empty.");
  if (recipients.length === 0) throw new Error("Secure chat needs at least one recipient key.");

  const cryptoRef = getCrypto();
  const senderPrivateKey = await importPrivateKey(senderPrivateJwk);
  const contentKey = await cryptoRef.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const rawContentKey = await cryptoRef.subtle.exportKey("raw", contentKey);
  const messageIv = randomBytes(12);
  const ciphertext = await cryptoRef.subtle.encrypt({ name: "AES-GCM", iv: messageIv }, contentKey, encodeText(plaintext.trim()));

  const keys = await Promise.all(
    recipients.map(async (recipient) => {
      const recipientPublicKey = await importPublicKey(recipient.publicJwk);
      const wrapKey = await deriveWrapKey({
        privateKey: senderPrivateKey,
        publicKey: recipientPublicKey,
        bookingId,
        senderId,
        senderDeviceId,
        recipientId: recipient.userId,
        recipientDeviceId: recipient.deviceId,
      });
      const wrapIv = randomBytes(12);
      const wrappedKey = await cryptoRef.subtle.encrypt({ name: "AES-GCM", iv: wrapIv }, wrapKey, rawContentKey);

      return {
        userId: recipient.userId,
        deviceId: recipient.deviceId,
        publicKeyId: recipient.publicKeyId,
        keyVersion: recipient.keyVersion,
        iv: bytesToBase64Url(wrapIv),
        wrappedKey: bytesToBase64Url(toUint8Array(wrappedKey)),
      } satisfies WrappedMessageKey;
    }),
  );

  return serialiseChatEnvelope({
    v: 1,
    alg: CHAT_ALGORITHM,
    senderId,
    senderDeviceId,
    senderPublicJwk,
    bookingId,
    createdAt: new Date().toISOString(),
    message: {
      iv: bytesToBase64Url(messageIv),
      ciphertext: bytesToBase64Url(toUint8Array(ciphertext)),
    },
    keys,
  });
};

export const decryptChatMessage = async ({
  body,
  currentUserId,
  currentDeviceId,
  privateJwk,
}: DecryptChatMessageInput) => {
  if (!isEncryptedChatBody(body)) return body;

  const envelope = parseEncryptedChatBody(body);
  if (!envelope) throw new Error("Secure chat envelope is invalid.");

  const wrapped =
    envelope.keys.find((key) => key.userId === currentUserId && key.deviceId === currentDeviceId) ??
    envelope.keys.find((key) => key.userId === currentUserId);

  if (!wrapped) throw new Error("Secure chat message was not addressed to this device.");

  const cryptoRef = getCrypto();
  const privateKey = await importPrivateKey(privateJwk);
  const senderPublicKey = await importPublicKey(envelope.senderPublicJwk);
  const wrapKey = await deriveWrapKey({
    privateKey,
    publicKey: senderPublicKey,
    bookingId: envelope.bookingId,
    senderId: envelope.senderId,
    senderDeviceId: envelope.senderDeviceId,
    recipientId: wrapped.userId,
    recipientDeviceId: wrapped.deviceId,
  });

  const rawContentKey = await cryptoRef.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(wrapped.iv) },
    wrapKey,
    base64UrlToBytes(wrapped.wrappedKey),
  );
  const contentKey = await importAesKey(rawContentKey, ["decrypt"]);
  const plaintext = await cryptoRef.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(envelope.message.iv) },
    contentKey,
    base64UrlToBytes(envelope.message.ciphertext),
  );

  return decodeText(plaintext);
};
