/**
 * Vite / Node treat a client that hangs up as a fatal error:
 * `Error: aborted` with `code: 'ECONNRESET'` and `unhandled: true`.
 * Twenty trial seats over a financial year will abort requests; each abort
 * must not take the dev server down.
 */

const ABORT_CODES = new Set([
  "ECONNRESET",
  "EPIPE",
  "ECONNABORTED",
  "ABORT_ERR",
  "ERR_STREAM_PREMATURE_CLOSE",
]);

export function isAbortNoise(err) {
  if (err == null || err === false) return false;
  const code = err.code ?? err.cause?.code;
  if (code && ABORT_CODES.has(code)) return true;
  const msg = String(err.message ?? err);
  return /(?:^|\b)aborted\b/i.test(msg) || /ECONNRESET/i.test(msg) || /socket hang up/i.test(msg);
}

const INSTALLED = Symbol.for("atlas.abortGuard");

/**
 * Swallow abort noise. Real errors still print and exit, matching Node's
 * default once a listener is installed.
 */
export function installAbortGuard(proc = process) {
  if (proc[INSTALLED]) return;
  proc[INSTALLED] = true;

  proc.on("unhandledRejection", (reason) => {
    if (isAbortNoise(reason)) return;
    console.error("[atlas] unhandledRejection", reason);
    proc.exit(1);
  });

  proc.on("uncaughtException", (err) => {
    if (isAbortNoise(err)) return;
    console.error("[atlas] uncaughtException", err);
    proc.exit(1);
  });
}
