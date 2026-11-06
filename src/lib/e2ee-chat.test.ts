import { describe, expect, it } from "vitest";

import {
  clearStoredDeviceKeyPair,
  createDeviceKeyPair,
  decryptChatMessage,
  encryptChatMessage,
  getMissingRecipientIds,
  isEncryptedChatBody,
  parseEncryptedChatBody,
} from "./e2ee-chat";

const cryptoIt = globalThis.crypto?.subtle ? it : it.skip;

describe("encrypted booking chat helpers", () => {
  cryptoIt("encrypts and decrypts a booking message for each addressed participant device", async () => {
    const alice = await createDeviceKeyPair("alice-phone");
    const bob = await createDeviceKeyPair("bob-phone");

    const body = await encryptChatMessage({
      plaintext: "Gate code stays private.",
      bookingId: "booking-1",
      senderId: "alice",
      senderDeviceId: alice.deviceId,
      senderPrivateJwk: alice.privateJwk,
      senderPublicJwk: alice.publicJwk,
      recipients: [
        { userId: "alice", deviceId: alice.deviceId, publicJwk: alice.publicJwk },
        { userId: "bob", deviceId: bob.deviceId, publicJwk: bob.publicJwk },
      ],
    });

    expect(isEncryptedChatBody(body)).toBe(true);
    expect(parseEncryptedChatBody(body)?.message.ciphertext).not.toContain("Gate code");
    await expect(
      decryptChatMessage({
        body,
        currentUserId: "bob",
        currentDeviceId: bob.deviceId,
        privateJwk: bob.privateJwk,
      }),
    ).resolves.toBe("Gate code stays private.");
    await expect(
      decryptChatMessage({
        body,
        currentUserId: "alice",
        currentDeviceId: alice.deviceId,
        privateJwk: alice.privateJwk,
      }),
    ).resolves.toBe("Gate code stays private.");
  });

  cryptoIt("rejects devices that were not addressed in the encrypted envelope", async () => {
    const alice = await createDeviceKeyPair("alice-phone");
    const bob = await createDeviceKeyPair("bob-phone");
    const charlie = await createDeviceKeyPair("charlie-phone");

    const body = await encryptChatMessage({
      plaintext: "Only booking participants can read this.",
      bookingId: "booking-2",
      senderId: "alice",
      senderDeviceId: alice.deviceId,
      senderPrivateJwk: alice.privateJwk,
      senderPublicJwk: alice.publicJwk,
      recipients: [{ userId: "bob", deviceId: bob.deviceId, publicJwk: bob.publicJwk }],
    });

    await expect(
      decryptChatMessage({
        body,
        currentUserId: "charlie",
        currentDeviceId: charlie.deviceId,
        privateJwk: charlie.privateJwk,
      }),
    ).rejects.toThrow(/not addressed/i);
  });

  it("does not treat legacy plaintext rows as encrypted envelopes", async () => {
    expect(isEncryptedChatBody("Hello from an older message")).toBe(false);
    await expect(
      decryptChatMessage({
        body: "Hello from an older message",
        currentUserId: "alice",
        privateJwk: {},
      }),
    ).resolves.toBe("Hello from an older message");
  });

  it("reports participant ids that do not have any active device key", () => {
    expect(
      getMissingRecipientIds(["alice", "bob", "charlie"], [
        { userId: "alice", deviceId: "alice-phone", publicJwk: {} },
        { userId: "bob", deviceId: "bob-phone", publicJwk: {} },
      ]),
    ).toEqual(["charlie"]);
  });

  /*
   * Security round 2, H-1: sender authentication. The envelope's `senderId` and
   * `senderPublicJwk` are attacker-controlled; without the trusted-keys check a malicious
   * participant could make their message render as the other party.
   */
  cryptoIt("accepts an envelope whose sender key matches the registered key", async () => {
    const alice = await createDeviceKeyPair("alice-phone");
    const bob = await createDeviceKeyPair("bob-phone");

    const body = await encryptChatMessage({
      plaintext: "Genuine alice message.",
      bookingId: "booking-3",
      senderId: "alice",
      senderDeviceId: alice.deviceId,
      senderPrivateJwk: alice.privateJwk,
      senderPublicJwk: alice.publicJwk,
      recipients: [{ userId: "bob", deviceId: bob.deviceId, publicJwk: bob.publicJwk }],
    });

    await expect(
      decryptChatMessage({
        body,
        currentUserId: "bob",
        currentDeviceId: bob.deviceId,
        privateJwk: bob.privateJwk,
        trustedSenderKeys: [{ userId: "alice", deviceId: alice.deviceId, publicJwk: alice.publicJwk }],
      }),
    ).resolves.toBe("Genuine alice message.");
  });

  cryptoIt("rejects an envelope claiming a sender whose key does not match the registered key", async () => {
    const alice = await createDeviceKeyPair("alice-phone");
    // Mallory is a real booking participant with her OWN registered key.
    const mallory = await createDeviceKeyPair("mallory-phone");
    const bob = await createDeviceKeyPair("bob-phone");

    // Mallory encrypts a message with her own key but claims senderId "alice".
    const spoofed = await encryptChatMessage({
      plaintext: "Send me the gate code, it's alice.",
      bookingId: "booking-4",
      senderId: "alice",
      senderDeviceId: mallory.deviceId,
      senderPrivateJwk: mallory.privateJwk,
      senderPublicJwk: mallory.publicJwk,
      recipients: [{ userId: "bob", deviceId: bob.deviceId, publicJwk: bob.publicJwk }],
    });

    await expect(
      decryptChatMessage({
        body: spoofed,
        currentUserId: "bob",
        currentDeviceId: bob.deviceId,
        privateJwk: bob.privateJwk,
        trustedSenderKeys: [
          { userId: "alice", deviceId: alice.deviceId, publicJwk: alice.publicJwk },
          { userId: "mallory", deviceId: mallory.deviceId, publicJwk: mallory.publicJwk },
        ],
      }),
    ).rejects.toThrow(/could not be verified/i);
  });

  cryptoIt("rejects an envelope whose claimed sender has no registered key on the booking", async () => {
    const mallory = await createDeviceKeyPair("mallory-phone");
    const bob = await createDeviceKeyPair("bob-phone");

    const spoofed = await encryptChatMessage({
      plaintext: "Unregistered sender.",
      bookingId: "booking-5",
      senderId: "ghost",
      senderDeviceId: mallory.deviceId,
      senderPrivateJwk: mallory.privateJwk,
      senderPublicJwk: mallory.publicJwk,
      recipients: [{ userId: "bob", deviceId: bob.deviceId, publicJwk: bob.publicJwk }],
    });

    await expect(
      decryptChatMessage({
        body: spoofed,
        currentUserId: "bob",
        currentDeviceId: bob.deviceId,
        privateJwk: bob.privateJwk,
        trustedSenderKeys: [{ userId: "bob", deviceId: bob.deviceId, publicJwk: bob.publicJwk }],
      }),
    ).rejects.toThrow(/not registered/i);
  });

  it("clearStoredDeviceKeyPair removes the key from storage (H-2)", () => {
    const store = new Map<string, string>();
    const fakeStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    } as unknown as Storage;

    fakeStorage.setItem("xoot:e2ee:device-key:v1:user-1", '{"deviceId":"d"}');
    expect(fakeStorage.getItem("xoot:e2ee:device-key:v1:user-1")).not.toBeNull();

    clearStoredDeviceKeyPair("user-1", fakeStorage);
    expect(fakeStorage.getItem("xoot:e2ee:device-key:v1:user-1")).toBeNull();
  });
});
