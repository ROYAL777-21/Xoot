type DocumentRecord = {
  id: string; user_id: string; application_id: string; doc_type: string; storage_path: string; status: string;
};
type DocumentInput = Omit<DocumentRecord, "id">;
type DocumentStore = {
  from(table: "xooter_documents"): {
    insert(value: DocumentInput): { select(fields: string): { single(): Promise<{ data: DocumentRecord | null; error: unknown }> } };
  };
};

/** A successful upload acknowledgment requires the actual owner-bound pending record. */
export async function persistApplicationDocument(store: DocumentStore, input: Omit<DocumentInput, "status">) {
  const parts = input.storage_path.split("/");
  if (parts.length !== 2 || parts[0] !== input.user_id || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(parts[1])) {
    throw new Error("Document must use the authenticated applicant's storage folder");
  }
  const { data, error } = await store.from("xooter_documents").insert({ ...input, status: "pending" })
    .select("id,user_id,application_id,doc_type,storage_path,status").single();
  if (error || !data?.id || data.user_id !== input.user_id || data.application_id !== input.application_id ||
    data.doc_type !== input.doc_type || data.storage_path !== input.storage_path || data.status !== "pending") {
    throw new Error("Document metadata could not be saved");
  }
  return data;
}
