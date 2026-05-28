import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { auditQuery, donorQuery, qk } from "@/lib/api/queries";
import * as api from "@/lib/api/mockApi";
import type {
  Citation,
  DonorDocument,
  DocumentType,
  ExtractedField,
  Donor,
  RuleFinding,
} from "@/lib/api/types";
import { DOCUMENT_TYPE_LABELS } from "@/lib/api/types";

import { StatusBadge } from "@/components/StatusBadge";
import { TissueTypeBadge } from "@/components/TissueTypeBadge";
import { CitationChip } from "@/components/CitationChip";
import { RuleChip } from "@/components/RuleChip";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { SectionCard } from "@/components/SectionCard";
import { SourceSheet } from "@/components/SourceSheet";
import { DocStatusBadge } from "@/components/DocStatusBadge";
import { DocumentRail, type RailGroup } from "@/components/extraction/DocumentRail";
import { DocumentExtractionPanel } from "@/components/extraction/DocumentExtractionPanel";
import type { ExtractionDensity } from "@/components/extraction/ExtractionFieldTable";
import { useCollapsedGroups } from "@/hooks/useCollapsedGroups";
import { Input } from "@/components/ui/input";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  CircleHelp,
  FileText,
  Download,
  PlayCircle,
  UploadCloud,
  Sparkles,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/donors/$id")({
  head: ({ params }) => ({ meta: [{ title: `${params.id} — TissueQA` }] }),
  loader: async ({ params, context }) => {
    try {
      await context.queryClient.ensureQueryData(donorQuery(params.id));
      await context.queryClient.ensureQueryData(auditQuery(params.id));
    } catch {
      throw notFound();
    }
  },
  component: DonorWorkspace,
});

function DonorWorkspace() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: donor } = useSuspenseQuery(donorQuery(id));

  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const sheetOpen = activeCitation !== null;

  const markReviewed = useMutation({
    mutationFn: () => api.markDonorReviewed(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.donor(id) });
      qc.invalidateQueries({ queryKey: qk.donors });
      qc.invalidateQueries({ queryKey: qk.audit(id) });
      toast.success("Donor marked reviewed");
    },
  });

  return (
    <div
      className="mx-auto space-y-5"
      style={{ padding: "clamp(16px, 3vw, 32px)", maxWidth: "1600px" }}
    >
      <DonorHeader
        donor={donor}
        onMarkReviewed={() => markReviewed.mutate()}
        reviewing={markReviewed.isPending}
      />

      <Tabs defaultValue="extraction" className="w-full">
        <TabsList className="bg-surface border border-border h-9 p-1">
          <TabsTrigger value="documents" className="h-7 text-xs">Documents</TabsTrigger>
          <TabsTrigger value="extraction" className="h-7 text-xs">Extraction</TabsTrigger>
          <TabsTrigger value="completeness" className="h-7 text-xs">Completeness</TabsTrigger>
          <TabsTrigger value="eligibility" className="h-7 text-xs">Eligibility</TabsTrigger>
          <TabsTrigger value="audit" className="h-7 text-xs">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab donor={donor} />
        </TabsContent>
        <TabsContent value="extraction" className="mt-4">
          <ExtractionTab donor={donor} onOpenCitation={setActiveCitation} />
        </TabsContent>
        <TabsContent value="completeness" className="mt-4">
          <CompletenessTab donor={donor} />
        </TabsContent>
        <TabsContent value="eligibility" className="mt-4">
          <EligibilityTab donor={donor} onOpenCitation={setActiveCitation} />
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <AuditTab donorId={id} />
        </TabsContent>
      </Tabs>

      <SourceSheet
        open={sheetOpen}
        onOpenChange={(v) => !v && setActiveCitation(null)}
        citation={activeCitation}
        donor={donor}
      />
    </div>
  );
}

// ─────────────────────────────── Header ──────────────────────────────────────

function DonorHeader({
  donor,
  onMarkReviewed,
  reviewing,
}: {
  donor: Donor;
  onMarkReviewed: () => void;
  reviewing: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Button asChild variant="ghost" size="sm" className="h-7 -ml-2 px-2 text-xs">
          <Link to="/donors"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> All donors</Link>
        </Button>
      </div>

      <div className="rounded-md border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-mono text-lg sm:text-xl font-medium tracking-tight text-foreground">
                {donor.id}
              </h1>
              <TissueTypeBadge type={donor.tissueType} expanded />
              {donor.evaluation ? (
                <>
                  <StatusBadge state={donor.evaluation.completeness.state} size="sm" />
                  <StatusBadge state={donor.evaluation.recommendation} size="sm" />
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Not yet evaluated. Upload documents and run extraction.
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span suppressHydrationWarning>
                Created {new Date(donor.createdAt).toLocaleDateString()}
              </span>
              <span>by <span className="text-foreground/80">{donor.createdBy}</span></span>
              {donor.evaluation && (
                <span suppressHydrationWarning>
                  Evaluated{" "}
                  {new Date(donor.evaluation.evaluatedAt).toLocaleDateString()} ·{" "}
                  <span className="font-mono">{donor.evaluation.rulesetVersion}</span>
                </span>
              )}
              {donor.reviewedBy && (
                <span className="inline-flex items-center gap-1 text-accept" suppressHydrationWarning>
                  <CheckCircle2 className="h-3 w-3" />
                  Reviewed by {donor.reviewedBy}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="outline" size="sm">
              <Link to="/donors/$id/report" params={{ id: donor.id }}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Report
              </Link>
            </Button>
            <Button size="sm" onClick={onMarkReviewed} disabled={reviewing || !donor.evaluation}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              {donor.reviewedBy ? "Mark reviewed again" : "Mark reviewed"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────── Documents tab ──────────────────────────────

const DOC_TYPES = Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, string][];

function DocumentsTab({ donor }: { donor: Donor }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"combined" | "per_doc">("per_doc");
  const [chosenType, setChosenType] = useState<DocumentType>("medical_records");

  const upload = useMutation({
    mutationFn: (input: { type: DocumentType; fileName: string }) =>
      api.uploadDocument(donor.id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.donor(donor.id) });
      qc.invalidateQueries({ queryKey: qk.audit(donor.id) });
      toast.success("Document uploaded (mock)");
    },
  });

  const uploadCombined = useMutation({
    mutationFn: () => api.uploadCombinedPdf(donor.id, "DonorPacket_combined.pdf"),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: qk.audit(donor.id) });
      toast.success(`Classified into ${res.classifications.length} documents (mock)`);
    },
  });

  const runEval = useMutation({
    mutationFn: () => api.runExtractionAndEvaluation(donor.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.donor(donor.id) });
      qc.invalidateQueries({ queryKey: qk.audit(donor.id) });
      toast.success("Extraction & evaluation completed (mock)");
    },
  });

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <SectionCard
        title="Uploaded documents"
        description="Files attached to this donor record."
        action={
          <Button size="sm" onClick={() => runEval.mutate()} disabled={runEval.isPending}>
            <Sparkles className="h-4 w-4 mr-1.5" />
            Run extraction & evaluation
          </Button>
        }
      >
        {donor.documents.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            No documents uploaded yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-surface-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">File name</th>
                <th className="px-4 py-2.5 font-medium text-right">Pages</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {donor.documents.map((d) => (
                <tr key={d.id} className="hover:bg-accent/40">
                  <td className="px-4 py-2.5 text-xs">{DOCUMENT_TYPE_LABELS[d.type]}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-[12px] inline-flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      {d.fileName}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">{d.pageCount}</td>
                  <td className="px-4 py-2.5">
                    <DocStatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground" suppressHydrationWarning>
                    {new Date(d.uploadedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard title="Upload" description="Add documents to this donor record.">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-surface-muted rounded-md">
            <button
              type="button"
              onClick={() => setMode("combined")}
              className={cn(
                "h-8 text-xs font-medium rounded transition-colors",
                mode === "combined" ? "bg-surface border border-border text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >Combined PDF</button>
            <button
              type="button"
              onClick={() => setMode("per_doc")}
              className={cn(
                "h-8 text-xs font-medium rounded transition-colors",
                mode === "per_doc" ? "bg-surface border border-border text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >Per document</button>
          </div>

          {mode === "per_doc" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Document type</label>
              <Select value={chosenType} onValueChange={(v) => setChosenType(v as DocumentType)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Dropzone
            onDrop={() => {
              if (mode === "combined") {
                uploadCombined.mutate();
              } else {
                upload.mutate({
                  type: chosenType,
                  fileName: `${chosenType}_${Date.now()}.pdf`,
                });
              }
            }}
            label={mode === "combined" ? "Drop combined donor packet (PDF)" : "Drop file for this document type"}
            sublabel="Click to simulate upload (mock)"
          />
        </div>
      </SectionCard>
    </div>
  );
}

function Dropzone({ onDrop, label, sublabel }: { onDrop: () => void; label: string; sublabel: string }) {
  return (
    <button
      type="button"
      onClick={onDrop}
      className="group w-full rounded-lg border-2 border-dashed border-border-strong bg-surface-muted/50 hover:bg-accent/40 hover:border-primary/50 transition-colors py-8 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <UploadCloud className="h-6 w-6 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
      <div className="mt-2 text-sm font-medium">{label}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sublabel}</div>
    </button>
  );
}

// ─────────────────────────────── Extraction tab ─────────────────────────────

type ExtractionFilter = "all" | "flagged" | "unreviewed";

function ExtractionTab({ donor, onOpenCitation }: { donor: Donor; onOpenCitation: (c: Citation) => void }) {
  const qc = useQueryClient();

  const setReviewed = useMutation({
    mutationFn: (v: { fieldId: string; reviewed: boolean }) =>
      api.setFieldReviewed(donor.id, v.fieldId, v.reviewed),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.donor(donor.id) });
      qc.invalidateQueries({ queryKey: qk.audit(donor.id) });
    },
  });

  const [selectedDoc, setSelectedDoc] = useState<string>("__all");
  const [filter, setFilter] = useState<ExtractionFilter>("all");
  const [q, setQ] = useState("");
  const [density, setDensity] = useState<ExtractionDensity>("comfortable");
  const { isCollapsed, toggle, setAll } = useCollapsedGroups(donor.id);

  const docsById = useMemo(
    () => new Map(donor.documents.map((d) => [d.id, d])),
    [donor.documents],
  );

  const railGroups: RailGroup[] = useMemo(() => {
    return donor.documents
      .map((doc) => {
        const fs = donor.fields.filter((f) => f.documentId === doc.id);
        return {
          doc,
          total: fs.length,
          flagged: fs.filter((f) => f.flaggedLowConfidence).length,
          unreviewed: fs.filter((f) => !f.reviewed).length,
        };
      })
      .filter((g) => g.total > 0);
  }, [donor.documents, donor.fields]);

  const totalAll = donor.fields.length;
  const flaggedAll = donor.fields.filter((f) => f.flaggedLowConfidence).length;
  const reviewedAll = donor.fields.filter((f) => f.reviewed).length;

  // Apply global filters/search to every field before passing to per-doc panels.
  const filtered = useMemo(() => {
    let arr = donor.fields;
    if (selectedDoc !== "__all") arr = arr.filter((f) => f.documentId === selectedDoc);
    if (filter === "flagged") arr = arr.filter((f) => f.flaggedLowConfidence);
    if (filter === "unreviewed") arr = arr.filter((f) => !f.reviewed);
    if (q.trim()) {
      const needle = q.toLowerCase();
      arr = arr.filter(
        (f) =>
          f.label.toLowerCase().includes(needle) ||
          f.key.toLowerCase().includes(needle) ||
          (f.value ?? "").toLowerCase().includes(needle),
      );
    }
    return arr;
  }, [donor.fields, selectedDoc, filter, q]);

  if (totalAll === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface-muted/40 py-16 text-center">
        <Sparkles className="h-5 w-5 mx-auto text-muted-foreground" />
        <h3 className="mt-3 text-sm font-medium">No extracted fields yet</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Upload documents and run extraction from the Documents tab.
        </p>
      </div>
    );
  }

  const selectedDocMeta = selectedDoc === "__all" ? null : docsById.get(selectedDoc) ?? null;
  const filterActive = filter !== "all" || q.trim().length > 0;

  // Docs to render: selected doc only, or all docs that still have fields after filtering.
  const docsToRender = selectedDocMeta
    ? [selectedDocMeta]
    : railGroups
        .map((g) => g.doc)
        .filter((d) => filtered.some((f) => f.documentId === d.id));

  const FilterBtn = ({ value, label, count }: { value: ExtractionFilter; label: string; count?: number }) => (
    <button
      type="button"
      onClick={() => setFilter(value)}
      className={cn(
        "h-7 px-2.5 rounded border text-xs font-medium inline-flex items-center gap-1.5 transition-colors",
        filter === value
          ? "border-foreground/30 bg-surface-muted text-foreground"
          : "border-border bg-surface text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {typeof count === "number" && (
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{count}</span>
      )}
    </button>
  );

  const DensityBtn = ({ value, label }: { value: ExtractionDensity; label: string }) => (
    <button
      type="button"
      onClick={() => setDensity(value)}
      className={cn(
        "h-7 px-2 text-[11px] font-medium transition-colors",
        density === value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  const visibleCount = filtered.length;

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <DocumentRail
        groups={railGroups}
        totalAll={totalAll}
        flaggedAll={flaggedAll}
        selected={selectedDoc}
        onSelect={setSelectedDoc}
      />

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[13px] font-medium text-foreground">
              {selectedDocMeta ? DOCUMENT_TYPE_LABELS[selectedDocMeta.type] : "All documents"}
            </h2>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
              {selectedDocMeta
                ? `${selectedDocMeta.fileName} · ${selectedDocMeta.pageCount}p`
                : `${railGroups.length} documents`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span><span className="text-foreground font-medium tabular-nums">{visibleCount}</span> shown</span>
            <span className="text-border">·</span>
            <span><span className="text-foreground font-medium tabular-nums">{reviewedAll}</span>/{totalAll} reviewed</span>
            {flaggedAll > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="text-indeterminate-foreground inline-flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {flaggedAll} flagged
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search fields…"
            className="h-8 text-xs w-full sm:w-64"
          />
          <div className="flex items-center gap-1.5">
            <FilterBtn value="all" label="All" count={totalAll} />
            <FilterBtn value="flagged" label="Flagged" count={flaggedAll} />
            <FilterBtn value="unreviewed" label="Unreviewed" count={totalAll - reviewedAll} />
          </div>
          <div className="ml-auto inline-flex items-center rounded border border-border bg-surface overflow-hidden">
            <DensityBtn value="comfortable" label="Comfortable" />
            <span className="w-px h-4 bg-border" />
            <DensityBtn value="compact" label="Compact" />
          </div>
        </div>

        {docsToRender.length === 0 ? (
          <div className="rounded-md border border-border bg-surface py-10 text-center text-[12px] text-muted-foreground">
            No fields match the current filters.
          </div>
        ) : (
          <div className="space-y-4">
            {docsToRender.map((doc) => (
              <DocumentExtractionPanel
                key={doc.id}
                doc={doc}
                fields={filtered.filter((f) => f.documentId === doc.id)}
                docsById={docsById}
                density={density}
                highlightQuery={q.trim() || undefined}
                filterActive={filterActive}
                isCollapsed={isCollapsed}
                toggle={toggle}
                setAll={setAll}
                showDocHeader={!selectedDocMeta}
                onToggleField={(fieldId, v) => setReviewed.mutate({ fieldId, reviewed: v })}
                onOpenCitation={onOpenCitation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



// ─────────────────────────────── Completeness tab ───────────────────────────

function CompletenessTab({ donor }: { donor: Donor }) {
  if (!donor.evaluation) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted/40 py-16 text-center text-sm text-muted-foreground">
        Run extraction & evaluation to compute the completeness checklist.
      </div>
    );
  }
  const { items, state } = donor.evaluation.completeness;
  const missing = items.filter((i) => i.status !== "present").length;

  return (
    <SectionCard
      title="Required documents & fields"
      description="Driven by the donor's tissue type."
      action={<StatusBadge state={state} size="sm" />}
    >
      <div className="px-5 py-4 border-b border-border bg-surface">
        <p className="text-sm">
          <span className="font-semibold">{state}</span>
          {missing > 0 && <span className="text-muted-foreground"> — {missing} item{missing === 1 ? "" : "s"} outstanding</span>}
        </p>
      </div>
      <ul className="divide-y divide-border">
        {items.map((item, i) => (
          <li key={i} className="px-5 py-3 flex items-center gap-3">
            {item.status === "present" && <CheckCircle2 className="h-4 w-4 text-accept shrink-0" />}
            {item.status === "missing" && <CircleHelp className="h-4 w-4 text-indeterminate-foreground shrink-0" />}
            {item.status === "low_confidence" && <AlertCircle className="h-4 w-4 text-indeterminate-foreground shrink-0" />}
            <div className="flex-1 text-sm">{item.requirement}</div>
            <span className={cn(
              "text-[11px] uppercase tracking-wider font-medium",
              item.status === "present" && "text-accept",
              item.status !== "present" && "text-indeterminate-foreground",
            )}>
              {item.status === "low_confidence" ? "low confidence" : item.status}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

// ─────────────────────────────── Eligibility tab ────────────────────────────

const EVAL_BANNER: Record<RuleFinding["state"], { bg: string; text: string; label: string; Icon: typeof CheckCircle2 }> = {
  ACCEPT: { bg: "bg-accept-soft border-accept/30", text: "text-accept", label: "ACCEPT", Icon: CheckCircle2 },
  REJECT: { bg: "bg-reject-soft border-reject/30", text: "text-reject", label: "REJECT", Icon: AlertCircle },
  INDETERMINATE: { bg: "bg-indeterminate-soft border-indeterminate/40", text: "text-indeterminate-foreground", label: "INDETERMINATE", Icon: AlertCircle },
};

function EligibilityTab({ donor, onOpenCitation }: { donor: Donor; onOpenCitation: (c: Citation) => void }) {
  if (!donor.evaluation) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted/40 py-16 text-center text-sm text-muted-foreground">
        Run extraction & evaluation to view the eligibility recommendation.
      </div>
    );
  }
  const { recommendation, findings, rulesetVersion } = donor.evaluation;
  const banner = EVAL_BANNER[recommendation];

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 sm:p-6", banner.bg)}>
        <div className="flex items-start gap-4">
          <banner.Icon className={cn("h-6 w-6 shrink-0 mt-0.5", banner.text)} />
          <div className="min-w-0">
            <div className={cn("text-xs uppercase tracking-widest font-semibold", banner.text)}>Recommendation</div>
            <div className={cn("text-lg sm:text-xl font-medium tracking-tight mt-0.5", banner.text)}>{banner.label}</div>
            <p className="text-xs text-muted-foreground mt-2 max-w-2xl">
              Computed by ruleset <span className="font-mono">{rulesetVersion}</span> against extracted fields and required documents.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-border bg-surface px-4 py-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <span>
          <span className="font-medium text-foreground">Recommendation only.</span>{" "}
          The Medical Director makes the eligibility determination. This system surfaces the inputs, citations, and ruleset reasoning — it does not decide.
        </span>
      </div>

      <div className="space-y-4">
        {findings.map((f) => (
          <FindingCard key={f.criterionId} finding={f} onOpenCitation={onOpenCitation} />
        ))}
      </div>
    </div>
  );
}

function FindingCard({ finding, onOpenCitation }: { finding: RuleFinding; onOpenCitation: (c: Citation) => void }) {
  return (
    <article className="rounded-md border border-border bg-card overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-border bg-surface">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-semibold tracking-wide bg-primary-soft text-primary px-1.5 py-0.5 rounded">
              {finding.criterionId}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
              {finding.severity}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground">{finding.title}</h3>
        </div>
        <StatusBadge state={finding.state} size="sm" />
      </header>

      <div className="px-5 py-4 space-y-4">
        <div>
          <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Inputs</h4>
          <ul className="space-y-2">
            {finding.inputs.map((input, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="text-muted-foreground min-w-[140px]">{input.label}</span>
                {input.value ? (
                  <span className="font-mono text-[13px] text-foreground">{input.value}</span>
                ) : (
                  <span className="text-xs italic text-indeterminate-foreground">missing</span>
                )}
                <CitationChip citation={input.sourceCitation} onClick={onOpenCitation} />
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        <div>
          <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Rule citation</h4>
          <RuleChip rule={finding.ruleCitation} />
        </div>

        <div className="rounded-md bg-surface-muted/60 border border-border px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Insight (not a determination)
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{finding.reasoning}</p>
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────── Audit tab ──────────────────────────────────

function AuditTab({ donorId }: { donorId: string }) {
  const { data } = useSuspenseQuery(auditQuery(donorId));
  return (
    <SectionCard title="Activity for this donor">
      {data.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">No audit entries.</div>
      ) : (
        <ol className="divide-y divide-border">
          {data.map((entry) => (
            <li key={entry.id} className="px-5 py-3 flex items-start gap-4 text-sm">
              <span className="font-mono text-[11px] text-muted-foreground w-44 shrink-0 mt-0.5" suppressHydrationWarning>
                {new Date(entry.timestamp).toLocaleString()}
              </span>
              <span className="font-mono text-[11px] text-primary bg-primary-soft px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                {entry.action}
              </span>
              <div className="min-w-0">
                <div className="text-foreground">{entry.detail}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">by {entry.actor}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
