type DocumentInput = { user_id: string; application_id: string; doc_type: string; storage_path: string };
type ObjectRecord = { id: string; updated_at: string; metadata: { size?: unknown; mimetype?: unknown } };
type DocumentRecord = DocumentInput & { id: string; status: string; safety_status: string };
type Inspection = ObjectRecord | {document: DocumentRecord};
type DocumentStore = {
  storage: { from(bucket: "kyc-docs"): { download(path: string): Promise<{ data: Blob | null; error: unknown }> } };
  rpc(name: "inspect_quarantined_kyc_object", input: Record<string, unknown>): Promise<{ data: Inspection | null; error: unknown }>;
  rpc(name: "register_quarantined_kyc_document", input: Record<string, unknown>): Promise<{ data: DocumentRecord | null; error: unknown }>;
};

export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
const extensions: Record<string, string[]> = {
  "application/pdf": ["pdf"], "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"],
};
const starts = (bytes: Uint8Array, signature: number[]) => signature.every((value, i) => bytes[i] === value);

/** Basic content validation only. A matching signature never means malware-free or genuine. */
export async function inspectDocumentBytes(bytes: Uint8Array, contentType: string, path: string) {
  if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES) throw new Error("Invalid document size");
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  if (!extensions[contentType]?.includes(extension)) throw new Error("Document type and extension must agree");
  const valid = contentType === "application/pdf" ? starts(bytes, [0x25,0x50,0x44,0x46,0x2d])
    : contentType === "image/jpeg" ? starts(bytes, [0xff,0xd8,0xff])
    : contentType === "image/png" ? starts(bytes, [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])
    : starts(bytes,[0x52,0x49,0x46,0x46]) && [0x57,0x45,0x42,0x50].every((value,i) => bytes[i+8] === value);
  if (!valid) throw new Error("Document contents do not match the declared type");
  const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer)))
    .map(value => value.toString(16).padStart(2,"0")).join("");
  return { sha256, content_type: contentType, byte_length: bytes.length };
}

/** The RPC seals metadata, receipt and selfie pointer atomically; files stay quarantined. */
export async function persistApplicationDocument(store: DocumentStore, input: DocumentInput) {
  const parts = input.storage_path.split("/");
  if (parts.length !== 2 || parts[0] !== input.user_id || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(parts[1])) {
    throw new Error("Document must use the authenticated applicant's storage folder");
  }
  if (!["id","proof_of_residence","bank_statement","selfie"].includes(input.doc_type)) throw new Error("Invalid document type");
  const object = await store.rpc("inspect_quarantined_kyc_object", {
    p_user_id: input.user_id, p_application_id: input.application_id, p_storage_path: input.storage_path,
  });
  if (!object.error && object.data && "document" in object.data) {
    const d=object.data.document;
    if (!d?.id || d.user_id!==input.user_id || d.application_id!==input.application_id || d.doc_type!==input.doc_type ||
      d.storage_path!==input.storage_path || d.status!=="pending" || d.safety_status!=="quarantined") throw new Error("Document quarantine could not be confirmed");
    return d;
  }
  if (object.data && "document" in object.data) throw new Error("Uploaded document not available for inspection");
  const expectedSize = Number(object.data?.metadata?.size);
  const contentType = String(object.data?.metadata?.mimetype ?? "");
  if (object.error || !object.data?.id || !object.data.updated_at || !Number.isSafeInteger(expectedSize) ||
      expectedSize < 1 || expectedSize > MAX_DOCUMENT_BYTES || !extensions[contentType]) throw new Error("Uploaded document not available for inspection");
  const download = await store.storage.from("kyc-docs").download(input.storage_path);
  if (download.error || !download.data || download.data.size !== expectedSize) throw new Error("Uploaded document changed or unavailable");
  const inspected = await inspectDocumentBytes(new Uint8Array(await download.data.arrayBuffer()), contentType, input.storage_path);
  const { data, error } = await store.rpc("register_quarantined_kyc_document", {
    p_user_id: input.user_id, p_application_id: input.application_id, p_doc_type: input.doc_type,
    p_storage_path: input.storage_path, p_object_id: object.data.id, p_object_updated_at: object.data.updated_at,
    p_sha256: inspected.sha256, p_content_type: inspected.content_type, p_byte_length: inspected.byte_length,
  });
  if (error || !data?.id || data.user_id !== input.user_id || data.application_id !== input.application_id ||
    data.doc_type !== input.doc_type || data.storage_path !== input.storage_path || data.status !== "pending" || data.safety_status !== "quarantined") {
    throw new Error("Document quarantine could not be confirmed");
  }
  return data;
}
