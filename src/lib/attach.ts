import { sha256demo } from "./hash";

/** Persist stays in the browser. Keep paper-quote / drawing blobs small. */
export const MAX_ATTACH_BYTES = 1_200_000;

export interface AttachMeta {
  fileName: string;
  fileKind: string;
  fileSize: number;
  fileDataUrl?: string;
  sha256: string;
}

export async function readAttachment(file: File): Promise<AttachMeta | { error: string }> {
  if (!file.size) return { error: "Empty file." };
  if (file.size > MAX_ATTACH_BYTES) {
    return {
      error: `File is over ${(MAX_ATTACH_BYTES / 1_000_000).toFixed(1)} MB. Local demo stores a copy in this browser — use a smaller PDF or photo.`,
    };
  }
  const fileDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
  return {
    fileName: file.name,
    fileKind: file.type || "application/octet-stream",
    fileSize: file.size,
    fileDataUrl,
    sha256: sha256demo(`${file.name}:${file.size}:${file.lastModified}`),
  };
}
