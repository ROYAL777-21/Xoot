export type BodyReadFailure = {
  ok: false;
  status: 400 | 413 | 415;
  error: string;
};

export type BodyReadSuccess<T> = {
  ok: true;
  value: T;
};

export type BodyReadResult<T> = BodyReadSuccess<T> | BodyReadFailure;

const normaliseContentType = (value: string | null) =>
  value?.split(";", 1)[0]?.trim().toLowerCase() ?? "";

const isAllowedContentType = (actual: string, allowed: readonly string[]) =>
  allowed.some((candidate) => {
    if (candidate === "application/json") {
      return actual === candidate || (actual.startsWith("application/") && actual.endsWith("+json"));
    }
    return actual === candidate;
  });

export const readRequestTextWithLimit = async (
  req: Request,
  options: {
    maxBytes: number;
    allowedContentTypes: readonly string[];
  },
): Promise<BodyReadResult<string>> => {
  const contentEncoding = req.headers.get("content-encoding")?.trim().toLowerCase();
  if (contentEncoding && contentEncoding !== "identity") {
    return { ok: false, status: 415, error: "compressed request bodies are not accepted" };
  }

  const contentType = normaliseContentType(req.headers.get("content-type"));
  if (!isAllowedContentType(contentType, options.allowedContentTypes)) {
    return { ok: false, status: 415, error: "unsupported content type" };
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (!Number.isFinite(parsedLength) || parsedLength < 0) {
      return { ok: false, status: 400, error: "invalid content length" };
    }
    if (parsedLength > options.maxBytes) {
      return { ok: false, status: 413, error: "request body too large" };
    }
  }

  if (!req.body) return { ok: true, value: "" };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > options.maxBytes) {
        await reader.cancel("request body too large").catch(() => undefined);
        return { ok: false, status: 413, error: "request body too large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: "request body could not be read" };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, status: 400, error: "request body must be valid UTF-8" };
  }
};

export const readJsonWithLimit = async (
  req: Request,
  maxBytes: number,
): Promise<BodyReadResult<Record<string, unknown>>> => {
  const body = await readRequestTextWithLimit(req, {
    maxBytes,
    allowedContentTypes: ["application/json"],
  });
  if (!body.ok) return body;

  try {
    const value = JSON.parse(body.value) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, status: 400, error: "request body must be a JSON object" };
    }
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return { ok: false, status: 400, error: "invalid JSON body" };
  }
};
