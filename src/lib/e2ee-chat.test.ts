import { describe, expect, it } from "vitest";

import {
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
});
