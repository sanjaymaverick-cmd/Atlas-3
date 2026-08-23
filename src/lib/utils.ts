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
