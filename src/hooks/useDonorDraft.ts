import { useCallback, useEffect, useState } from "react";
import type { DocumentType, TissueType } from "@/lib/api/types";

export interface DraftDocument {
  type: DocumentType;
  fileName: string;
  pageCount: number;
}

export interface DonorDraft {
  step: number;
  id: string;
  tissueType: TissueType;
  documents: DraftDocument[];
}

const STORAGE_KEY = "tissueqa.draft.newDonor";

export const emptyDraft = (suggestedId: string): DonorDraft => ({
  step: 0,
  id: suggestedId,
  tissueType: "BT",
  documents: [],
});

function read(): DonorDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DonorDraft;
  } catch {
    return null;
  }
}

function write(draft: DonorDraft | null) {
  if (typeof window === "undefined") return;
  try {
    if (draft) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function useDonorDraft(suggestedId: string) {
  const [draft, setDraft] = useState<DonorDraft>(() => read() ?? emptyDraft(suggestedId));
  const [dirty, setDirty] = useState(false);

  // Persist on every change.
  useEffect(() => {
    if (dirty) write(draft);
  }, [draft, dirty]);

  const update = useCallback((patch: Partial<DonorDraft>) => {
    setDirty(true);
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  const clear = useCallback(() => {
    write(null);
    setDirty(false);
  }, []);

  return { draft, update, clear, dirty };
}
