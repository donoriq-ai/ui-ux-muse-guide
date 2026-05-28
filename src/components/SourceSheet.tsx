import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Citation, Donor } from "@/lib/api/types";
import { resolveDocImage } from "@/lib/docImages";
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
  const doc = citation && donor?.documents.find((d) => d.id === citation.documentId);
  const imgSrc = doc ? resolveDocImage({ type: doc.type, fileName: doc.fileName }) : null;
  const bbox = citation?.bbox;

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
              <div className="mt-0.5"><ConfidenceMeter value={citation.confidence} /></div>
            </div>
            {bbox && (
              <div className="col-span-2">
                <div className="text-muted-foreground">Bounding box</div>
                <div className="font-mono mt-0.5 text-[11px]">
                  x={bbox[0].toFixed(3)} · y={bbox[1].toFixed(3)} · w={bbox[2].toFixed(3)} · h={bbox[3].toFixed(3)}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto p-5 bg-surface-muted">
          {imgSrc && (
            <div className="relative mx-auto bg-white border border-border-strong shadow-elevated" style={{ width: "min(100%, 520px)" }}>
              <img src={imgSrc} alt="Source page preview (synthetic)" className="block w-full h-auto" />
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
          )}
          <p className="text-[11px] text-muted-foreground text-center mt-4">
            Synthetic page preview. Bounding box shown at extracted region.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
