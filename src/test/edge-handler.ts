import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Execute real entrypoints and local imports; only the external Supabase transport is fake.
export function edgeHandler(entry: string, createClient: (...args: unknown[]) => unknown, env: Record<string, string> = {}) {
  let handler: (request: Request) => Promise<Response>;
  const cache = new Map<string, { exports: Record<string, unknown> }>();
  const load = (file: string): Record<string, unknown> => {
    if (cache.has(file)) return cache.get(file)!.exports;
    const module = { exports: {} };
    cache.set(file, module);
    const compiled = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: file,
    }).outputText;
    runInNewContext(compiled, {
      module, exports: module.exports,
      require: (specifier: string) => {
        if (specifier === "https://esm.sh/@supabase/supabase-js@2") return { createClient };
        if (!specifier.startsWith(".")) throw new Error(`Unexpected external import: ${specifier}`);
        return load(resolve(dirname(file), specifier));
      },
      Deno: { env: { get: (key: string) => env[key] }, serve: (callback: typeof handler) => { handler = callback; } },
      Request, Response, FormData, URLSearchParams, TextEncoder, TextDecoder, URL, AbortController, crypto, btoa, atob,
      console: { error: () => {}, warn: () => {}, log: () => {} },
      fetch: () => { throw new Error("Unexpected network request"); }, setTimeout, clearTimeout,
    }, { filename: file });
    return module.exports;
  };
  load(resolve(entry));
  return (request: Request) => handler(request);
}
