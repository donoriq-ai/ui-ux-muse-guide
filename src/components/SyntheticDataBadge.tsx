import { FlaskConical } from "lucide-react";

export function SyntheticDataBadge() {
  return (
    <span
      role="note"
      title="This prototype shows synthetic placeholder data only. No real patient information."
      className="inline-flex items-center gap-1.5 rounded-md border border-indeterminate/40 bg-indeterminate-soft px-2 h-7 text-[11px] font-medium text-indeterminate-foreground"
    >
      <FlaskConical size={13} aria-hidden />
      Synthetic data — prototype only
    </span>
  );
}
