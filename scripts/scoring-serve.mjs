#!/usr/bin/env node
/**
 * Train (if needed) and serve native CatBoost on 127.0.0.1:8091.
 * Categoricals go through cat_features. Atlas does not re-implement OTS.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "services", "scoring");
const win = process.platform === "win32";
const venvPy = win
  ? join(root, ".venv", "Scripts", "python.exe")
  : join(root, ".venv", "bin", "python");

function run(command, args) {
  const r = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false });
  if (r.status) process.exit(r.status ?? 1);
}

if (!existsSync(venvPy)) {
  run("python", ["-m", "venv", ".venv"]);
}
run(venvPy, ["-m", "pip", "install", "-q", "-r", "requirements.txt"]);
if (!existsSync(join(root, "model.cbm"))) {
  run(venvPy, ["train.py"]);
}

const child = spawn(venvPy, ["serve.py"], { cwd: root, stdio: "inherit", shell: false });
child.on("exit", (code) => process.exit(code ?? 1));
