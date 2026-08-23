#!/usr/bin/env node
/**
 * Talk to the empty educational TallyPrime on this laptop.
 * Usage: node scripts/tally-agent.mjs [ping|bootstrap|company-day]
 */
import {
  ensureTallyServerIni,
  findTallyExe,
  handleTallyAction,
  launchTally,
} from "./tally-xml.mjs";

const action = process.argv[2] || "company-day";

const exe = findTallyExe();
console.log(JSON.stringify({ tallyExe: exe, ini: ensureTallyServerIni() }, null, 2));
if (exe) launchTally();

const result = await handleTallyAction({ action });
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 2;
