import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Camera, Flag, Lock, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { getBookingChatSafety } from "@/lib/booking-chat-safety";
import { alwaysCurrent, type VisitActionGuard } from "@/components/visits/action-contract";
import { decryptChatMessage, encryptChatMessage, getMissingRecipientIds, getOrCreateStoredDeviceKeyPair, isE2eeSupported, isEncryptedChatBody, type E2eeRecipientKey, type StoredDeviceKeyPair } from "@/lib/e2ee-chat";
import { chatClosed, clearPending, mergeMessages, messageTime, olderMessages, readPendingAttempts, reconcileMessage, savePending, type ChatMessage } from "@/components/visits/chat-records";
import type { VisitBooking, VisitXooter } from "@/components/visits/visit-data";
import "@/styles/tracking-chat-handoff.css";

type Props = VisitActionGuard & {
  bookingId: string; booking: VisitBooking; xooter?: VisitXooter | null;
  messages: ChatMessage[]; currentUserId: string; hasMore?: boolean; screen?: boolean;
};
type PublicKeyRow = { id: string; user_id: string; device_id: string; public_jwk: JsonWebKey; key_version: number; revoked_at?: string | null };
type Security = { loading: boolean; ready: boolean; issue: string | null; deviceKey: StoredDeviceKeyPair | null; recipientKeys: E2eeRecipientKey[] };
const initial: Security = { loading: true, ready: false, issue: null, deviceKey: null, recipientKeys: [] };

/** Changing an account or booking destroys every draft, key, history and provider lifetime. */
export function BookingChat(props: Props) {
  return <ChatThread key={`${props.currentUserId}/${props.bookingId}`} {...props} />;
}
function ChatThread({ bookingId, booking, xooter, messages, currentUserId, hasMore = messages.length === 100, screen = false, isCurrent = alwaysCurrent, invoke }: Props) {
  const [body, setBody] = useState("");
  const [security, setSecurity] = useState<Security>(initial);
  const [retryKeys, setRetryKeys] = useState(0);
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState<ChatMessage[]>([]);
  const latestPage = useMemo(() => mergeMessages(messages),[messages]);
  const pageIdentity = `${hasMore}:${latestPage.map(row => `${row.created_at}/${row.id}`).join(",")}`;
  const [history,setHistory] = useState(() => ({ rows: latestPage, before: latestPage[0], more: hasMore, pageIdentity, revision: 0 }));
  const more = history.more;
  // Retain observed pages, but restart the contiguous frontier at each new server
  // latest page. A local acknowledgement/old fragment cannot skip a missing interval.
  useEffect(() => {
    setHistory(old => old.pageIdentity === pageIdentity ? { ...old, rows:mergeMessages(old.rows,latestPage) }
      : { rows:mergeMessages(old.rows,latestPage), before:latestPage[0], more:hasMore, pageIdentity, revision:old.revision+1 });
  },[latestPage,hasMore,pageIdentity]);
  const [olderBusy, setOlderBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [journal] = useState(() => {
    try { return { pending: readPendingAttempts(currentUserId, bookingId), issue: null }; }
    catch { return { pending: [], issue: "Pending message storage is unavailable. Sending is paused; please contact support." }; }
  });
  const [pendingAttempts, setPendingAttempts] = useState(journal.pending);
  const pending = pendingAttempts[0];
  const acknowledge = (attempt: typeof pending) => {
    clearPending(currentUserId,bookingId,attempt);
    setPendingAttempts(rows => rows.filter(row => row.id !== attempt.id));
  };
  const [notice, setNotice] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const life = useRef({ mounted: false, version: 0, sending: false, older: false, reporting: false });
  const scroll = useRef<HTMLDivElement>(null);
  const closed = chatClosed(booking.status, booking.cancelled_at);
  const closedRef = useRef(closed); closedRef.current = closed;
  const senderType = xooter?.user_id === currentUserId ? "xooter" : "user";
  const participants = useMemo(() => [...new Set([booking.user_id, xooter?.user_id].filter(Boolean) as string[])], [booking.user_id, xooter?.user_id]);
  const records = useMemo(() => mergeMessages(history.rows,extra, messages), [history.rows,extra, messages]);
  const latestMessage = records.at(-1)?.id;
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [latestMessage]);
  const current = useCallback((version: number) => life.current.mounted && life.current.version === version && isCurrent(), [isCurrent]);
  useEffect(() => {
    const scope = life.current; scope.mounted = true;
    return () => { scope.mounted = false; scope.version++; scope.sending = false; scope.older = false; scope.reporting = false; };
  }, []);
  const request = useCallback(async <T,>(name: string, payload: Record<string, unknown>): Promise<T> => {
    if (invoke) return invoke<T>(name, payload);
    const result = await supabase.functions.invoke(name, { body: payload });
    if (result.error || result.data?.success === false || result.data?.error) throw new Error("Chat request failed");
    return result.data as T;
  }, [invoke]);

  useEffect(() => {
    const version = life.current.version; let cancelled = false;
    const active = () => !cancelled && current(version);
    setSecurity(initial);
    void (async () => {
      try {
        if (!participants.includes(currentUserId)) throw new Error("participant");
        if (!isE2eeSupported()) { if (active()) setSecurity({ ...initial, loading: false, issue: "Secure chat needs Web Crypto support on this device." }); return; }
        const deviceKey = await getOrCreateStoredDeviceKeyPair(currentUserId);
        if (!active()) return;
        const session = await supabase.auth.getSession();
        if (!active()) return;
        if (session.error || session.data.session?.user.id !== currentUserId) throw new Error("account");
        const publish = await supabase.from("user_encryption_keys").upsert({ user_id: currentUserId, device_id: deviceKey.deviceId, public_jwk: deviceKey.publicJwk as unknown as Json, key_version: deviceKey.keyVersion, last_seen_at: new Date().toISOString(), revoked_at: null }, { onConflict: "user_id,device_id" });
        if (!active()) return;
        if (publish.error) throw publish.error;
        if (participants.length < 2) { setSecurity({ ...initial, loading: false, deviceKey, issue: "Secure chat will activate once a Xooter is assigned to this booking." }); return; }
        const response = await request<{ data?: { keys?: PublicKeyRow[] } }>("get-booking-public-keys", { booking_id: bookingId });
        if (!active()) return;
        const rows = (response.data?.keys ?? []).filter(row => participants.includes(row.user_id) && row.device_id && row.public_jwk && !row.revoked_at);
        if (!rows.some(row => row.user_id === currentUserId && row.device_id === deviceKey.deviceId)) rows.push({ id: "local-device-key", user_id: currentUserId, device_id: deviceKey.deviceId, public_jwk: deviceKey.publicJwk, key_version: deviceKey.keyVersion });
        const recipientKeys = rows.map(row => ({ userId: row.user_id, deviceId: row.device_id, publicJwk: row.public_jwk, publicKeyId: row.id, keyVersion: row.key_version }));
        const missing = getMissingRecipientIds(participants, recipientKeys);
        setSecurity({ loading: false, ready: !missing.length, issue: missing.length ? "Secure chat is waiting for each booking participant to open this booking once." : null, deviceKey, recipientKeys });
      } catch { if (active()) setSecurity({ ...initial, loading: false, issue: "Secure chat keys are unavailable. Please try again." }); }
    })();
    return () => { cancelled = true; };
  }, [bookingId, currentUserId, participants, retryKeys, request, current]);

  useEffect(() => {
    const version = life.current.version; let cancelled = false;
    const key = security.deviceKey;
    void (async () => {
      const next: Record<string, string> = {};
      for (const message of records) {
        if (!key || !isEncryptedChatBody(message.body)) continue;
        try { next[message.id] = await decryptChatMessage({ body: message.body, currentUserId, currentDeviceId: key.deviceId, privateJwk: key.privateJwk }); }
        catch { next[message.id] = "This secure message cannot be decrypted on this device."; }
        if (cancelled || !current(version)) return;
      }
      if (!cancelled && current(version)) setDecrypted(next);
    })();
    return () => { cancelled = true; };
  }, [records, security.deviceKey, currentUserId, current]);

  useEffect(() => {
    const version = life.current.version;
    const ids = records.filter(message => message.sender_type !== senderType && (!isEncryptedChatBody(message.body) || decrypted[message.id] && !decrypted[message.id].startsWith("This secure message"))).map(message => message.id);
    if (!ids.length || !current(version)) return;
    void request("mark-booking-message-read", { booking_id: bookingId, message_ids: ids.slice(-100) }).catch(() => {});
  }, [bookingId, records, decrypted, senderType, request, current]);

  const checkPending = async () => {
    if (!pending || life.current.sending) return;
    const version = life.current.version; life.current.sending = true; setSending(true);
    try {
      const saved = await reconcileMessage(bookingId, currentUserId, pending);
      if (!current(version)) return;
      if (saved) { acknowledge(pending); setExtra(rows => mergeMessages(rows, [saved])); setBody(""); setNotice("Message recorded."); }
      else setNotice("Send status is still unconfirmed. Sending is paused to prevent a duplicate. Check again or contact support.");
    } catch { if (current(version)) setNotice("Send status could not be checked. Please retry the check or contact support."); }
    finally { if (current(version)) { life.current.sending = false; setSending(false); } }
  };
  const retryPending = async () => {
    if (!pending || life.current.sending) return;
    const version = life.current.version; life.current.sending = true; setSending(true);
    try {
      const response = await request<{ data?: { message?: ChatMessage & { booking_id: string; sender_user_id: string; client_message_id: string } } }>("send-booking-message", { booking_id: bookingId, client_message_id: pending.id, encrypted_body: pending.envelope, client_safety_flags: pending.flags });
      if (!current(version)) return;
      const saved = response.data?.message;
      if (!saved?.id || saved.booking_id !== bookingId || saved.sender_user_id !== currentUserId || saved.client_message_id !== pending.id || saved.body !== pending.envelope || !saved.created_at) throw new Error("Unconfirmed acknowledgement");
      acknowledge(pending); setExtra(rows => mergeMessages(rows, [saved])); setBody(""); setNotice("Message recorded.");
    } catch { if (current(version)) setNotice("Message is still unconfirmed. Your original message is kept. Retry or contact support."); }
    finally { if (current(version)) { life.current.sending = false; setSending(false); } }
  };
  // A persisted row is acknowledgement even if its HTTP response was lost.
  useEffect(() => {
    if (!pending || !records.some(message => message.body === pending.envelope && message.sender_user_id === currentUserId && message.client_message_id === pending.id)) return;
    try { clearPending(currentUserId, bookingId,pending); setPendingAttempts(rows => rows.filter(row => row.id !== pending.id)); setBody(""); setNotice("Message recorded."); }
    catch { setNotice("Message recorded; pending state could not be cleared. Contact support before sending again."); }
  }, [records, pending, senderType, currentUserId, bookingId]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = body.trim(), version = life.current.version;
    if (!text || closedRef.current || !current(version) || life.current.sending || pending || journal.issue) return;
    const safety = getBookingChatSafety(text);
    if (!safety.allowed) { setNotice(safety.message ?? "Keep sensitive booking details out of chat."); return; }
    if (!security.ready || !security.deviceKey) return;
    life.current.sending = true; setSending(true); setNotice(null);
    let attempted = false;
    try {
      const key = security.deviceKey;
      const envelope = await encryptChatMessage({ plaintext: text, bookingId, senderId: currentUserId, senderDeviceId: key.deviceId, senderPrivateJwk: key.privateJwk, senderPublicJwk: key.publicJwk, recipients: security.recipientKeys });
      if (!current(version) || closedRef.current) return;
      const attempt = { id: crypto.randomUUID(), envelope, flags: safety.flags };
      savePending(currentUserId, bookingId, attempt); setPendingAttempts(rows => [...rows,attempt]); attempted = true;
      const response = await request<{ data?: { message?: ChatMessage & { booking_id: string; sender_user_id: string; client_message_id: string } } }>("send-booking-message", { booking_id: bookingId, encrypted_body: envelope, client_safety_flags: attempt.flags, client_message_id: attempt.id });
      if (!current(version)) return;
      const saved = response.data?.message;
      if (!saved?.id || saved.booking_id !== bookingId || saved.sender_user_id !== currentUserId || saved.client_message_id !== attempt.id || saved.body !== envelope || !saved.created_at) throw new Error("Unconfirmed acknowledgement");
      acknowledge(attempt); setExtra(rows => mergeMessages(rows, [saved])); setBody(""); setNotice("Message recorded.");
    } catch { if (current(version)) setNotice(attempted ? "Send status is unconfirmed. Retry this message with the same key or check send status." : "Message could not be prepared. Your draft is kept; please try again."); }
    finally { if (current(version)) { life.current.sending = false; setSending(false); } }
  };
  const loadOlder = async () => {
    const first = history.before, revision = history.revision, version = life.current.version;
    if (!first || life.current.older || !current(version)) return;
    life.current.older = true; setOlderBusy(true);
    const height = scroll.current?.scrollHeight ?? 0, top = scroll.current?.scrollTop ?? 0;
    try {
      const page = await olderMessages(bookingId, first);
      if (!current(version)) return;
      setHistory(old => ({ ...old, rows:mergeMessages(old.rows,page.messages),
        ...(old.revision === revision ? { before:page.messages[0] ?? first, more:page.hasMore } : {}) })); setNotice(null);
      requestAnimationFrame(() => { if (current(version) && scroll.current) scroll.current.scrollTop = top + scroll.current.scrollHeight - height; });
    } catch { if (current(version)) setNotice("Older messages could not be loaded. Please try again."); }
    finally { if (current(version)) { life.current.older = false; setOlderBusy(false); } }
  };
  const report = async (id: string) => {
    const version = life.current.version;
    if (life.current.reporting || !current(version)) return;
    life.current.reporting = true; setReporting(id);
    try { const response = await request<{ success?: boolean }>("report-booking-message", { message_id: id, reason: "User reported a booking chat message" }); if (current(version)) setNotice(response.success ? "Message reported for Xoot review." : "Message report was not confirmed. Please try again."); }
    catch { if (current(version)) setNotice("Message report could not be sent. Please try again."); }
    finally { if (current(version)) { life.current.reporting = false; setReporting(null); } }
  };
  return <section className={`xoot-chat ${screen ? "is-screen" : "is-inline"}`} aria-label="Booking messages">
    <div className="xoot-chat-security"><ShieldCheck size={14} /><span>{security.ready ? "End-to-end encrypted booking chat" : security.loading ? "Preparing secure booking chat…" : security.issue}</span>{!security.ready && !security.loading && <button type="button" onClick={() => setRetryKeys(value => value + 1)}>Retry secure chat</button>}</div>
    <div ref={scroll} className="xoot-chat-history" aria-label="Message history">
      {more && records.length > 0 && <button className="xoot-chat-older" type="button" onClick={() => void loadOlder()} disabled={olderBusy}>{olderBusy ? "Loading older messages…" : "Load older messages"}</button>}
      {!records.length && <p className="xoot-chat-empty">No messages yet.</p>}
      {records.map((message, index) => {
        const own = message.sender_type === senderType, secure = isEncryptedChatBody(message.body);
        const day = messageTime(message.created_at, true);
        return <div className="xoot-chat-record" key={message.id}>
          {(index === 0 || day !== messageTime(records[index - 1].created_at, true)) && <p className="xoot-chat-day">{day}</p>}
          <div className={`xoot-chat-bubble ${own ? "is-own" : "is-other"}`}>
            <p>{secure ? decrypted[message.id] ?? (security.loading ? "Decrypting secure message…" : "Secure message unavailable on this device.") : message.body}</p>
            <div className="xoot-chat-meta"><time dateTime={message.created_at}>{messageTime(message.created_at)}</time><span>{own ? "Sent" : "Received"}{!secure && " · Legacy message"}</span><button type="button" aria-label="Report booking chat message" onClick={() => void report(message.id)} disabled={Boolean(reporting)}><Flag size={12} /></button></div>
          </div>
        </div>;
      })}
    </div>
    {journal.issue && <p className="xoot-chat-notice" role="alert">{journal.issue} <Link to={`/app/support?booking=${encodeURIComponent(bookingId)}`}>Contact support</Link></p>}
    {notice && <p role="status" className="xoot-chat-notice">{notice}</p>}
    {pending && <div className="xoot-chat-pending"><p>{pendingAttempts.length > 1 ? `${pendingAttempts.length} messages are waiting for send confirmation. Resolve each original attempt in turn.` : "A message is waiting for send confirmation."}</p><button type="button" disabled={sending} onClick={() => void retryPending()}>Retry this message</button><button type="button" disabled={sending} onClick={() => void checkPending()}>Check send status</button><Link to={`/app/support?booking=${encodeURIComponent(bookingId)}`}>Contact support</Link></div>}
    {closed ? <div className="xoot-chat-closed"><Lock size={19} /><strong>This chat is closed</strong><p>Messaging has ended for this visit. Our team can help with anything else.</p><Link className="xoot-detail-button is-outline" to={`/app/support?booking=${encodeURIComponent(bookingId)}`}>Message the team</Link></div> : <div className="xoot-chat-composer">
      <div className="xoot-chat-quick">{["See you soon", "Please start upstairs", "I'll be home"].map(text => <button key={text} type="button" disabled={!security.ready || sending || Boolean(pending) || Boolean(journal.issue)} onClick={() => setBody(text)}>{text}</button>)}</div>
      <form onSubmit={send}><button type="button" className="xoot-detail-icon" aria-label="Send a photo unavailable" disabled title="Chat photo sharing is unavailable"><Camera size={20} /></button><label className="sr-only" htmlFor={`chat-${bookingId}`}>Message your Xooter</label><input id={`chat-${bookingId}`} value={body} maxLength={2000} onChange={event => setBody(event.target.value)} placeholder={`Message ${xooter?.name?.split(" ")[0] || "your Xooter"}`} disabled={!security.ready || sending || Boolean(pending) || Boolean(journal.issue)} /><button type="submit" className="xoot-chat-send" aria-label="Send message" disabled={!security.ready || sending || Boolean(pending) || Boolean(journal.issue) || !body.trim()} aria-busy={sending}><ArrowRight size={20} /></button></form>
      <p className="xoot-chat-photo-state">Chat photo sharing is unavailable. Visit proof is managed in visit options.</p>
    </div>}
  </section>;
}
export default BookingChat;
