import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  decryptChatMessage,
  encryptChatMessage,
  getMissingRecipientIds,
  getOrCreateStoredDeviceKeyPair,
  isE2eeSupported,
  isEncryptedChatBody,
  type E2eeRecipientKey,
  type StoredDeviceKeyPair,
} from "@/lib/e2ee-chat";

type Msg = { id: string; sender_type: string; body: string; created_at: string };

type PublicKeyRow = {
  id: string;
  user_id: string;
  device_id: string;
  public_jwk: JsonWebKey;
  key_version: number;
  revoked_at: string | null;
};

type BookingChatProps = {
  bookingId?: string;
  booking: any;
  zooter?: any;
  messages: Msg[];
  currentUserId?: string;
};

type ChatSecurityState = {
  loading: boolean;
  ready: boolean;
  issue: string | null;
  deviceKey: StoredDeviceKeyPair | null;
  recipientKeys: E2eeRecipientKey[];
};

const initialSecurityState: ChatSecurityState = {
  loading: true,
  ready: false,
  issue: null,
  deviceKey: null,
  recipientKeys: [],
};

const uniqueIds = (values: Array<string | null | undefined>) => Array.from(new Set(values.filter(Boolean) as string[]));

export const BookingChat = ({ bookingId, booking, zooter, messages, currentUserId }: BookingChatProps) => {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptedBodies, setDecryptedBodies] = useState<Record<string, string>>({});
  const [security, setSecurity] = useState<ChatSecurityState>(initialSecurityState);
  const scrollRef = useRef<HTMLDivElement>(null);

  const participantIds = useMemo(
    () => uniqueIds([booking?.user_id, booking?.zooter?.user_id]),
    [booking?.user_id, booking?.zooter?.user_id],
  );
  const currentSenderType = booking?.zooter?.user_id === currentUserId ? "zooter" : "user";

  useEffect(() => {
    let cancelled = false;

    const initialiseSecureChat = async () => {
      if (!bookingId || !currentUserId) return;

      if (!isE2eeSupported()) {
        setSecurity({
          ...initialSecurityState,
          loading: false,
          issue: "Secure chat needs Web Crypto support on this device.",
        });
        return;
      }

      try {
        const deviceKey = await getOrCreateStoredDeviceKeyPair(currentUserId);
        const now = new Date().toISOString();
        const { error: publishError } = await (supabase as any).from("user_encryption_keys").upsert(
          {
            user_id: currentUserId,
            device_id: deviceKey.deviceId,
            public_jwk: deviceKey.publicJwk,
            key_version: deviceKey.keyVersion,
            last_seen_at: now,
            revoked_at: null,
          },
          { onConflict: "user_id,device_id" },
        );

        if (publishError) throw publishError;

        if (participantIds.length < 2) {
          if (!cancelled) {
            setSecurity({
              loading: false,
              ready: false,
              issue: "Secure chat will activate once a Zooter is assigned to this booking.",
              deviceKey,
              recipientKeys: [
                {
                  userId: currentUserId,
                  deviceId: deviceKey.deviceId,
                  publicJwk: deviceKey.publicJwk,
                  keyVersion: deviceKey.keyVersion,
                },
              ],
            });
          }
          return;
        }

        const { data, error } = await (supabase as any)
          .from("user_encryption_keys")
          .select("id,user_id,device_id,public_jwk,key_version,revoked_at")
          .in("user_id", participantIds);

        if (error) throw error;

        const rows = ((data ?? []) as PublicKeyRow[]).filter(
          (row) => !row.revoked_at && row.user_id && row.device_id && row.public_jwk,
        );
        const hasCurrentDevice = rows.some(
          (row) => row.user_id === currentUserId && row.device_id === deviceKey.deviceId,
        );

        if (!hasCurrentDevice) {
          rows.push({
            id: "local-device-key",
            user_id: currentUserId,
            device_id: deviceKey.deviceId,
            public_jwk: deviceKey.publicJwk,
            key_version: deviceKey.keyVersion,
            revoked_at: null,
          });
        }

        const recipientKeys = rows.map((row) => ({
          userId: row.user_id,
          deviceId: row.device_id,
          publicJwk: row.public_jwk,
          publicKeyId: row.id,
          keyVersion: row.key_version,
        }));
        const missing = getMissingRecipientIds(participantIds, recipientKeys);

        if (!cancelled) {
          setSecurity({
            loading: false,
            ready: missing.length === 0,
            issue:
              missing.length === 0
                ? null
                : "Secure chat is waiting for each booking participant to open this booking once.",
            deviceKey,
            recipientKeys,
          });
        }
      } catch {
        if (!cancelled) {
          setSecurity({
            ...initialSecurityState,
            loading: false,
            issue: "Secure chat keys are unavailable. Try again after the key migration is applied.",
          });
        }
      }
    };

    initialiseSecureChat();
    return () => {
      cancelled = true;
    };
  }, [bookingId, currentUserId, participantIds]);

  useEffect(() => {
    let cancelled = false;

    const decryptMessages = async () => {
      const encryptedMessages = messages.filter((message) => isEncryptedChatBody(message.body));
      if (encryptedMessages.length === 0) {
        setDecryptedBodies({});
        return;
      }

      const deviceKey = security.deviceKey;
      if (!currentUserId || !deviceKey) return;

      setDecrypting(true);
      const next: Record<string, string> = {};
      await Promise.all(
        encryptedMessages.map(async (message) => {
          try {
            next[message.id] = await decryptChatMessage({
              body: message.body,
              currentUserId,
              currentDeviceId: deviceKey.deviceId,
              privateJwk: deviceKey.privateJwk,
            });
          } catch {
            next[message.id] = "This secure message cannot be decrypted on this device.";
          }
        }),
      );

      if (!cancelled) {
        setDecryptedBodies(next);
        setDecrypting(false);
      }
    };

    decryptMessages();
    return () => {
      cancelled = true;
    };
  }, [messages, currentUserId, security.deviceKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, decryptedBodies]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || !bookingId || !currentUserId) return;

    if (!security.ready || !security.deviceKey) {
      toast.error(security.issue ?? "Secure chat is still preparing.");
      return;
    }

    setSending(true);
    try {
      const encryptedBody = await encryptChatMessage({
        plaintext: text,
        bookingId,
        senderId: currentUserId,
        senderDeviceId: security.deviceKey.deviceId,
        senderPrivateJwk: security.deviceKey.privateJwk,
        senderPublicJwk: security.deviceKey.publicJwk,
        recipients: security.recipientKeys,
      });

      setBody("");
      const { error } = await (supabase as any)
        .from("messages")
        .insert({ booking_id: bookingId, sender_type: currentSenderType, body: encryptedBody });

      if (error) throw error;
    } catch {
      setBody(text);
      toast.error("Secure message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const getMessageBody = (message: Msg) => {
    if (!isEncryptedChatBody(message.body)) return message.body;
    return decryptedBodies[message.id] ?? (decrypting ? "Decrypting secure message..." : "Secure message unavailable on this device.");
  };

  return (
    <Card className="rounded-3xl flex flex-col h-[500px] overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display font-bold">Chat with {zooter?.name?.split(" ")[0] ?? "Zooter"}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              {security.ready
                ? "End-to-end encrypted booking chat"
                : security.loading
                  ? "Preparing secure booking chat"
                  : security.issue ?? "Secure chat is unavailable"}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
            {security.ready ? "E2EE" : "Setup"}
          </span>
        </div>
      </div>

      {!security.ready && !security.loading && security.issue && (
        <div className="mx-4 mt-3 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          {security.issue}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Say hi</p>}
        {messages.map((message) => {
          const isOwn = message.sender_type === currentSenderType;
          const isSecure = isEncryptedChatBody(message.body);
          return (
            <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  isOwn ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                <div>{getMessageBody(message)}</div>
                {isSecure && <div className="mt-1 text-[10px] opacity-70">Encrypted</div>}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="p-3 border-t border-border flex gap-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={security.ready ? "Type a secure message..." : "Secure chat is setting up..."}
          disabled={!security.ready || sending}
          className="rounded-full"
        />
        <Button type="submit" size="icon" disabled={!security.ready || sending || !body.trim()} className="rounded-full">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </Card>
  );
};

export default BookingChat;
