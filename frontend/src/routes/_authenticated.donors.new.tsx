import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import * as api from "@/lib/api/client";
import { qk } from "@/lib/api/queries";
import { setPendingUpload } from "@/lib/pendingUpload";
import { WizardShell } from "@/components/donor-wizard/WizardShell";
import { IdentifiersStep } from "@/components/donor-wizard/steps/Identifiers";
import { DocumentsStep, type PerDocFile } from "@/components/donor-wizard/steps/Documents";
import { ReviewStep } from "@/components/donor-wizard/steps/Review";
import { useDonorDraft, emptyDraft } from "@/hooks/useDonorDraft";

const STEPS = [
  { key: "identifiers", label: "Identifiers" },
  { key: "documents", label: "Documents" },
  { key: "review", label: "Review" },
];

const ID_RE = /^D-\d{4}-\d{3,5}$/;

export const Route = createFileRoute("/_authenticated/donors/new")({
  head: () => ({ meta: [{ title: "New donor — TissueQA" }] }),
  component: NewDonorWizard,
});

function NewDonorWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const suggestedId = useMemo(() => api.nextDonorId(), []);
  const { draft, update, clear } = useDonorDraft(suggestedId);
  const [idError, setIdError] = useState<string | undefined>();

  // Transient upload state — not persisted to localStorage (File is not serialisable)
  const [uploadMode, setUploadMode] = useState<"combined" | "per_doc">("combined");
  const [combinedFile, setCombinedFile] = useState<File | null>(null);
  const [perDocFiles, setPerDocFiles] = useState<PerDocFile[]>([]);

  const create = useMutation({
    // Only createDonor blocks the button — the upload runs in the workspace.
    mutationFn: () =>
      api.createDonor({ id: draft.id, tissueType: draft.tissueType, documents: [] }),
    onSuccess: (donor) => {
      const hasUpload =
        (uploadMode === "combined" && combinedFile !== null) ||
        (uploadMode === "per_doc" && perDocFiles.length > 0);

      if (hasUpload) {
        setPendingUpload(donor.id, {
          mode: uploadMode,
          combinedFile,
          perDocFiles,
        });
      }

      clear();
      qc.invalidateQueries({ queryKey: qk.donors });
      navigate({ to: "/donors/$id", params: { id: donor.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create donor"),
  });

  const goto = (i: number) => update({ step: Math.max(0, Math.min(STEPS.length - 1, i)) });

  const validateIdentifiers = () => {
    const id = draft.id.trim().toUpperCase();
    if (!id) {
      setIdError("Donor ID is required");
      return false;
    }
    if (!ID_RE.test(id)) {
      setIdError("Format: D-YYYY-NNNN (e.g. D-2026-0005)");
      return false;
    }
    setIdError(undefined);
    if (id !== draft.id) update({ id });
    return true;
  };

  const handleNext = () => {
    if (draft.step === 0 && !validateIdentifiers()) return;
    if (draft.step === STEPS.length - 1) {
      create.mutate();
      return;
    }
    goto(draft.step + 1);
  };

  const handleCancel = () => {
    const hasInput =
      draft.id !== suggestedId ||
      draft.tissueType !== "BT" ||
      combinedFile !== null ||
      perDocFiles.length > 0;
    if (hasInput && !window.confirm("Discard this donor draft?")) return;
    clear();
    update(emptyDraft(suggestedId));
    navigate({ to: "/donors" });
  };

  const titles: Record<number, { title: string; description: string }> = {
    0: {
      title: "Identifiers",
      description: "Assign a donor ID and pick the tissue type.",
    },
    1: {
      title: "Initial documents",
      description:
        uploadMode === "combined"
          ? "Upload one combined donor packet — sections split automatically."
          : "Attach individual PDFs and assign a document type to each.",
    },
    2: {
      title: "Review & create",
      description: "Confirm the details below. You can edit anything from the workspace afterward.",
    },
  };

  return (
    <WizardShell
      steps={STEPS}
      current={draft.step}
      onStepClick={goto}
      title={titles[draft.step].title}
      description={titles[draft.step].description}
      onCancel={handleCancel}
      onBack={draft.step > 0 ? () => goto(draft.step - 1) : undefined}
      hideBack={draft.step === 0}
      onNext={handleNext}
      nextLabel={draft.step === STEPS.length - 1 ? "Create donor" : "Continue"}
      nextPending={create.isPending}
    >
      {draft.step === 0 && (
        <IdentifiersStep
          id={draft.id}
          tissueType={draft.tissueType}
          error={idError}
          onChange={(p) => {
            if (p.id !== undefined) setIdError(undefined);
            update(p);
          }}
        />
      )}
      {draft.step === 1 && (
        <DocumentsStep
          tissueType={draft.tissueType}
          mode={uploadMode}
          onModeChange={(m) => {
            setUploadMode(m);
            // Clear the other mode's files when switching
            if (m === "combined") setPerDocFiles([]);
            else setCombinedFile(null);
          }}
          combinedFile={combinedFile}
          onCombinedFileChange={setCombinedFile}
          perDocFiles={perDocFiles}
          onPerDocFilesChange={setPerDocFiles}
        />
      )}
      {draft.step === 2 && (
        <ReviewStep
          id={draft.id}
          tissueType={draft.tissueType}
          uploadMode={uploadMode}
          combinedFile={combinedFile}
          perDocFiles={perDocFiles}
        />
      )}
    </WizardShell>
  );
}
