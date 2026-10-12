import { afterEach, describe, expect, it, vi } from "vitest";

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

describe("persistent device-key creation lifetimes (actual helper)", () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });
  const helper = async () => { vi.resetModules(); return import("./e2ee-chat"); };
  const holdGeneration = async () => {
    const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const generate = vi.spyOn(crypto.subtle, "generateKey").mockImplementationOnce(async () => { await gate; return pair; });
    return { release, generate };
  };
  cryptoIt("overlapping same-account StrictMode initializations retain one generated and stored key", async () => {
    const api = await helper(), gate = await holdGeneration();
    const first = api.getOrCreateStoredDeviceKeyPair("alice"), remount = api.getOrCreateStoredDeviceKeyPair("alice");
    gate.release();
    const [a,b] = await Promise.all([first,remount]);
    expect(a).toEqual(b);
    expect(gate.generate).toHaveBeenCalledTimes(1);
    expect(api.readStoredDeviceKeyPair("alice")).toEqual(a);
  });
  cryptoIt("A → B → A shares the in-flight A key without crossing account namespaces", async () => {
    const api = await helper(), gate = await holdGeneration();
    const oldA = api.getOrCreateStoredDeviceKeyPair("alice");
    const b = await api.getOrCreateStoredDeviceKeyPair("bob");
    const newA = api.getOrCreateStoredDeviceKeyPair("alice");
    gate.release();
    const [old,active] = await Promise.all([oldA,newA]);
    expect(old).toEqual(active);
    expect(active.deviceId).not.toBe(b.deviceId);
    expect(api.readStoredDeviceKeyPair("alice")).toEqual(active);
    expect(api.readStoredDeviceKeyPair("bob")).toEqual(b);
    expect(gate.generate).toHaveBeenCalledTimes(2);
  });
  cryptoIt("releases a rejected generation so a later attempt can recover", async () => {
    const api = await helper();
    const generate = vi.spyOn(crypto.subtle,"generateKey").mockRejectedValueOnce(new Error("generation denied"));
    const results = await Promise.allSettled([api.getOrCreateStoredDeviceKeyPair("alice"),api.getOrCreateStoredDeviceKeyPair("alice")]);
    expect(results.every(result => result.status === "rejected")).toBe(true);
    expect(api.readStoredDeviceKeyPair("alice")).toBeNull();
    const recovered = await api.getOrCreateStoredDeviceKeyPair("alice");
    expect(api.readStoredDeviceKeyPair("alice")).toEqual(recovered);
    expect(generate).toHaveBeenCalledTimes(2);
  });
  cryptoIt("reuses existing persisted private/public key material without generation", async () => {
    const api = await helper(), key = await api.createDeviceKeyPair("existing-device");
    api.writeStoredDeviceKeyPair("alice",key);
    const generate = vi.spyOn(crypto.subtle,"generateKey");
    expect(await api.getOrCreateStoredDeviceKeyPair("alice")).toEqual(key);
    expect(generate).not.toHaveBeenCalled();
  });
  cryptoIt("does not overwrite a persisted winner that appeared during unsupported-lock generation", async () => {
    vi.stubGlobal("navigator", { locks: undefined });
    const api = await helper(), winner = await api.createDeviceKeyPair("other-tab"), gate = await holdGeneration();
    const pending = api.getOrCreateStoredDeviceKeyPair("alice");
    api.writeStoredDeviceKeyPair("alice",winner);
    gate.release();
    expect(await pending).toEqual(winner);
    expect(api.readStoredDeviceKeyPair("alice")).toEqual(winner);
  });
  cryptoIt("separate module realms serialize same-account creation using the origin Web Lock", async () => {
    const tails = new Map<string,Promise<unknown>>();
    const request = vi.fn((name:string, work:() => Promise<unknown>) => {
      const result = (tails.get(name) ?? Promise.resolve()).then(work);
      tails.set(name,result.catch(() => {}));
      return result;
    });
    vi.stubGlobal("navigator", { locks: { request } });
    const tabA = await helper(), tabB = await helper(), gate = await holdGeneration();
    const first = tabA.getOrCreateStoredDeviceKeyPair("alice"), second = tabB.getOrCreateStoredDeviceKeyPair("alice");
    await vi.waitFor(() => expect(gate.generate).toHaveBeenCalledTimes(1));
    gate.release();
    const [a,b] = await Promise.all([first,second]);
    expect(a).toEqual(b);
    expect(gate.generate).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls.every(([name]) => name === tabA.getDeviceKeyStorageKey("alice"))).toBe(true);
    expect(tabB.readStoredDeviceKeyPair("alice")).toEqual(a);
  });
});
