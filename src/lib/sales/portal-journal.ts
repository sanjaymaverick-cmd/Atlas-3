import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { IngestRequest, IngestResult } from "@/lib/sales/ingest";
import type { PortalId } from "@/lib/sales/adapters";

export interface JournalEvent {
  id: string;
  at: string;
  portal: PortalId;
  idempotencyKey: string;
  ingest?: IngestRequest;
  result: IngestResult & { queued?: boolean };
  raw: unknown;
  acked?: boolean;
}

interface JournalFile {
  events: JournalEvent[];
}

function journalPath() {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "..", "data", "portal-journal.json");
}

function empty(): JournalFile {
  return { events: [] };
}

export function readJournal(): JournalFile {
  try {
    const p = journalPath();
    if (!existsSync(p)) return empty();
    const parsed = JSON.parse(readFileSync(p, "utf8")) as JournalFile;
    return { events: Array.isArray(parsed.events) ? parsed.events : [] };
  } catch {
    return empty();
  }
}

function writeJournal(file: JournalFile) {
  const p = journalPath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify({ events: file.events.slice(0, 200) }, null, 2));
}

export function findJournal(key: string) {
  return readJournal().events.find((e) => e.idempotencyKey === key);
}

export function appendJournal(event: JournalEvent) {
  const file = readJournal();
  file.events = [event, ...file.events.filter((e) => e.id !== event.id)].slice(0, 200);
  writeJournal(file);
  return event;
}

export function ackJournal(ids: string[]) {
  const file = readJournal();
  const set = new Set(ids);
  file.events = file.events.map((e) => (set.has(e.id) ? { ...e, acked: true } : e));
  writeJournal(file);
}

export function pendingJournal() {
  return readJournal().events.filter((e) => !e.acked && e.ingest);
}
