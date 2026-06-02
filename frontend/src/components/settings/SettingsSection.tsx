import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";

export function SettingsSection({
  title,
  description,
  dirty,
  saving,
  onSave,
  onReset,
  readOnly,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
  readOnly?: boolean;
  children: React.ReactNode;
}) {
  return (
    <SectionCard
      title={title}
      description={description}
      action={
        !readOnly && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onReset}
              disabled={!dirty || saving}
            >
              Reset
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={onSave} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        )
      }
    >
      <div className="p-4">{children}</div>
    </SectionCard>
  );
}
