import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function inr(amount: number, compact = false) {
  if (compact && Math.abs(amount) >= 10_000_000) {
    return `₹${(amount / 10_000_000).toFixed(2)} Cr`;
  }
  if (compact && Math.abs(amount) >= 100_000) {
    return `₹${(amount / 100_000).toFixed(1)} L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function pct(n: number) {
  return `${n.toFixed(0)}%`;
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Whole days from today to ISO date (negative = overdue). */
export function daysUntil(iso: string) {
  const a = new Date(iso.slice(0, 10) + "T00:00:00");
  const b = new Date(todayIso() + "T00:00:00");
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export function holdExpiryLabel(until: string) {
  const d = daysUntil(until);
  if (d < 0) return `Expired ${Math.abs(d)}d ago`;
  if (d === 0) return "Expires today";
  if (d === 1) return "Expires in 1d";
  return `Expires in ${d}d`;
}
