// GENERATED FILE — DO NOT EDIT.
// Copied from src/lib/xootcred-read.ts by scripts/build/sync-shared-native.mjs.
// Edit the source and run `npm run shared:sync`.

export const XOOTCRED_PAGE_SIZE = 500;

type LedgerPage<T> = { data: T[] | null; error: { message: string } | null };

/** Read every page before exposing a balance; an incomplete ledger is not a balance. */
export async function readAllXootCredRows<T>(
  readPage: (from: number, to: number) => PromiseLike<LedgerPage<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += XOOTCRED_PAGE_SIZE) {
    const { data, error } = await readPage(offset, offset + XOOTCRED_PAGE_SIZE - 1);
    if (error || !Array.isArray(data)) {
      throw new Error(error?.message ?? "XootCred ledger is unavailable");
    }
    rows.push(...data);
    if (data.length < XOOTCRED_PAGE_SIZE) return rows;
  }
}
