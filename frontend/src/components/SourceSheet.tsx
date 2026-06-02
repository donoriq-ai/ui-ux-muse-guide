import { useEffect, useState } from "react";
import { Loader2, FileX } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Citation, Donor } from "@/lib/api/types";
import { fetchDocumentPage } from "@/lib/api/client";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";

export function SourceSheet({
  open,
  onOpenChange,
  citation,
  donor,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  citation: Citation | null;
  donor: Donor | undefined;
}) {
  const bbox = citation?.bbox;

  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || !citation || !donor) {
      setSrc(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setSrc(null);
    setFailed(false);
    fetchDocumentPage(donor.id, citation.documentId, citation.page)
      .then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
        if (!url) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, citation, donor]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col gap-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="text-sm font-semibold">Source document</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            {citation ? `${citation.documentLabel} · p.${citation.page}` : ""}
          </SheetDescription>
        </SheetHeader>

        {citation && (
          <div className="px-5 py-3 border-b border-border bg-surface-muted/40 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">Page</div>
              <div className="font-mono mt-0.5">{citation.page}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Confidence</div>
              <div className="mt-0.5">
                <ConfidenceMeter value={citation.confidence} />
              </div>
            </div>
            {bbox && (
              <div className="col-span-2">
                <div className="text-muted-foreground">Bounding box</div>
                <div className="font-mono mt-0.5 text-[11px]">
                  x={bbox[0].toFixed(3)} · y={bbox[1].toFixed(3)} · w={bbox[2].toFixed(3)} · h=
                  {bbox[3].toFixed(3)}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto p-5 bg-surface-muted">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-[11px]">Rendering source page…</span>
            </div>
          ) : failed ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <FileX className="h-5 w-5" />
              <span className="text-[11px] text-center max-w-xs">
                Source PDF page not available. The document may not have been stored, or this
                citation belongs to an older record.
              </span>
            </div>
          ) : (
            src && (
              <div
                className="relative mx-auto bg-white border border-border-strong"
                style={{ width: "min(100%, 520px)" }}
              >
                <img src={src} alt="Source page" className="block w-full h-auto" />
                {bbox && (
                  <div
                    aria-hidden
                    className="absolute border-2 border-indeterminate bg-indeterminate/15 pointer-events-none"
                    style={{
                      left: `${bbox[0] * 100}%`,
                      top: `${bbox[1] * 100}%`,
                      width: `${bbox[2] * 100}%`,
                      height: `${bbox[3] * 100}%`,
                    }}
                  />
                )}
              </div>
            )
          )}
          {!loading && !failed && src && (
            <p className="text-[11px] text-muted-foreground text-center mt-4">
              Source page rendered from the uploaded PDF. Bounding box shown at extracted region.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
