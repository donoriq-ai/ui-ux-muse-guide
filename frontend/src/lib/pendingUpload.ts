/**
 * In-memory hand-off store for files chosen in the new-donor wizard.
 *
 * The wizard creates the donor record immediately (fast), stashes the chosen
 * File(s) here, then navigates to the workspace. The workspace picks them up on
 * mount and runs the actual upload — so the user sees real-time extraction
 * progress instead of a blocked "Working…" button.
 *
 * Files are intentionally NOT persisted to localStorage (File is not
 * serialisable). A hard-refresh loses the pending upload; the workspace's
 * manual upload panel is the fallback in that case.
 */

import type { DocumentType } from "@/lib/api/types";

export interface PerDocEntry {
  type: DocumentType;
  file: File;
}

export interface PendingUpload {
  mode: "combined" | "per_doc";
  combinedFile: File | null;
  perDocFiles: PerDocEntry[];
}

const _store = new Map<string, PendingUpload>();

/** Store a pending upload keyed by donor ID. */
export function setPendingUpload(donorId: string, payload: PendingUpload): void {
  _store.set(donorId, payload);
}

/**
 * Retrieve and remove a pending upload.
 * Returns undefined if nothing is waiting for this donor.
 */
export function takePendingUpload(donorId: string): PendingUpload | undefined {
  const value = _store.get(donorId);
  _store.delete(donorId);
  return value;
}

/** Check without consuming — used to decide the default tab. */
export function hasPendingUpload(donorId: string): boolean {
  return _store.has(donorId);
}
