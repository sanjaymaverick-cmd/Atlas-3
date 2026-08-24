import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { installAbortGuard, isAbortNoise } from "./abort-guard.mjs";

test("ECONNRESET, aborted, and hang-up are noise", () => {
  assert.equal(isAbortNoise({ code: "ECONNRESET", message: "aborted", unhandled: true }), true);
  assert.equal(isAbortNoise({ code: "EPIPE" }), true);
  assert.equal(isAbortNoise({ code: "ABORT_ERR" }), true);
  assert.equal(isAbortNoise({ message: "aborted" }), true);
  assert.equal(isAbortNoise({ message: "socket hang up" }), true);
  assert.equal(isAbortNoise({ cause: { code: "ECONNRESET" }, message: "other" }), true);
});

test("real errors are not noise", () => {
  assert.equal(isAbortNoise(null), false);
  assert.equal(isAbortNoise({ message: "DB bootstrap failed" }), false);
  assert.equal(isAbortNoise(new Error("ENOENT: no such file")), false);
});

test("installAbortGuard is idempotent and swallows abort rejections", () => {
  const fake = new EventEmitter();
  fake.exit = () => {
    throw new Error("should not exit on abort noise");
  };
  installAbortGuard(fake);
  installAbortGuard(fake);
  assert.equal(fake.listeners("unhandledRejection").length, 1);
  fake.emit("unhandledRejection", { code: "ECONNRESET", message: "aborted" });
  fake.emit("uncaughtException", { code: "EPIPE", message: "write EPIPE" });
});
