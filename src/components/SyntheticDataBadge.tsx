import { FlaskConical } from "lucide-react";

export function SyntheticDataBadge() {
  return (
    <span
      role="note"
      title="This prototype shows synthetic placeholder data only. No real patient information."
      className="inline-flex items-center gap-1.5 rounded border border-indeterminate/30 bg-indeterminate-soft/60 px-2 h-7 text-[11px] font-medium text-indeterminate-foreground"
    >
      <FlaskConical size={12} aria-hidden />
      Synthetic data — prototype
    </span>
  );
}
